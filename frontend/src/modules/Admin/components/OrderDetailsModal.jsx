import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiMapPin, FiPackage, FiCreditCard, FiClock, FiBriefcase, FiMail, FiPhone } from 'react-icons/fi';
import { formatCurrency, formatDateTime, getStatusColor } from '../utils/adminHelpers';
import Badge from '../../../shared/components/Badge';

const OrderDetailsModal = ({ order, isOpen, onClose }) => {
  if (!order) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
                <p className="text-sm text-gray-500 mt-1">ID: {order.orderCode || order.id || order._id}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <FiX className="text-xl text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-admin">
              {/* Status and Date */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FiClock className="text-blue-600 text-lg" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Order Date</p>
                    <p className="text-sm font-semibold text-gray-800">{formatDateTime(order.orderDate || order.date || order.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FiPackage className="text-blue-600 text-lg" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wider text-right">Status</p>
                    <Badge variant={order.status}>{order.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Customer, Vendor and Shipping */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold text-gray-800 border-b pb-2">
                    <FiUser className="text-primary-500" />
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-800">{typeof order.customer === 'object' ? order.customer.name : (order.customerSnapshot?.name || order.customer)}</p>
                    {(order.customer?.email || order.customerSnapshot?.email) && <p className="text-sm text-gray-600">{order.customer?.email || order.customerSnapshot?.email}</p>}
                    {(order.customer?.phone || order.customerSnapshot?.phone) && <p className="text-sm text-gray-600">{order.customer?.phone || order.customerSnapshot?.phone}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 font-bold text-gray-800 border-b pb-2">
                    <FiMapPin className="text-primary-500" />
                    Shipping Address
                  </h3>
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {order.shippingAddress ? (
                      <>
                        <p className="font-medium text-gray-800">{order.shippingAddress.fullName || order.shippingAddress.name || order.customerSnapshot?.name}</p>
                        <p>{order.shippingAddress.address || order.shippingAddress.street}</p>
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                        <p>{order.shippingAddress.country || 'India'}</p>
                        {(order.shippingAddress.phone || order.customerSnapshot?.phone) && <p>Phone: {order.shippingAddress.phone || order.customerSnapshot?.phone}</p>}
                      </>
                    ) : (
                      <p className="italic text-gray-400">Address details not provided</p>
                    )}
                  </div>
                </div>

                {/* Vendor Details */}
                {order.vendorItems && order.vendorItems.length > 0 && (
                  <div className="md:col-span-2 space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-gray-800 border-b pb-2">
                      <FiBriefcase className="text-primary-500" />
                      Vendor Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {order.vendorItems.map((vendor, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-1">
                          <p className="text-sm font-bold text-gray-800">{vendor.vendorName}</p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <FiMail className="text-[10px]" /> {vendor.vendorEmail || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <FiPhone className="text-[10px]" /> {vendor.vendorPhone || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-bold text-gray-800 border-b pb-2">
                  <FiPackage className="text-primary-500" />
                  Order Items
                </h3>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="px-4 py-3 text-left font-semibold">Product</th>
                        <th className="px-4 py-3 text-center font-semibold">Qty</th>
                        <th className="px-4 py-3 text-right font-semibold">Price</th>
                        <th className="px-4 py-3 text-right font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Array.isArray(order.items) ? (
                        order.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-800">{item.name}</td>
                            <td className="px-4 py-3 text-center text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-gray-400 italic">
                            Detailed item list not available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="flex justify-end pt-4">
                <div className="w-full max-w-xs space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal || (order.total - (order.tax || 0) - (order.shippingFee || 0)))}</span>
                  </div>
                  {(order.tax > 0) && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax</span>
                      <span>{formatCurrency(order.tax)}</span>
                    </div>
                  )}
                  {(order.shippingFee > 0) && (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Shipping</span>
                      <span>{formatCurrency(order.shippingFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-primary-600">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailsModal;
