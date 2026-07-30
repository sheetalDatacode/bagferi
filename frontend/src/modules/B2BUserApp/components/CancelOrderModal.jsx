import React, { useState } from 'react';
import { FiX, FiCheckCircle } from 'react-icons/fi';

const CancelOrderModal = ({ isOpen, onClose, onSubmit, order }) => {
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('wallet'); // 'wallet' | 'bank_transfer'
  
  // Bank details form state
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    upiId: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      cancellationReason,
      refundMethod,
      bankDetails: refundMethod === 'bank_transfer' ? bankDetails : {},
    });
  };

  const advancePayment = order?.advancePayment || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-black text-gray-900 uppercase tracking-tight text-sm">
            Cancel Order #{order?.orderNumber}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          {advancePayment > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3.5 text-xs text-amber-800">
              <span className="font-bold block mb-1">Advance Refund Notice:</span>
              You paid an advance of <span className="font-bold">₹{advancePayment}</span> for this order. It will be refunded according to your choice below.
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
              Reason for Cancellation *
            </label>
            <textarea
              required
              rows={2}
              placeholder="Please describe why you are cancelling this order..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          {advancePayment > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Refund Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRefundMethod('wallet')}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center transition-all ${
                    refundMethod === 'wallet'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-bold">Add to Wallet</span>
                  <span className="text-[9px] text-gray-400 mt-0.5">Instant Refund</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRefundMethod('bank_transfer')}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center transition-all ${
                    refundMethod === 'bank_transfer'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-1 ring-indigo-500'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xs font-bold">Bank/UPI Transfer</span>
                  <span className="text-[9px] text-gray-400 mt-0.5">Takes 3-5 days</span>
                </button>
              </div>

              {refundMethod === 'bank_transfer' && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200/60 space-y-2">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">
                    Enter Bank Account or UPI Details
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="UPI ID (e.g. name@okhdfc)"
                      value={bankDetails.upiId}
                      onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 transition-all bg-white"
                    />
                  </div>
                  <div className="text-center text-[9px] text-gray-400 font-bold uppercase py-0.5">
                    — OR —
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Acc Holder Name"
                      value={bankDetails.accountHolderName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 transition-all bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 transition-all bg-white"
                    />
                    <input
                      type="text"
                      placeholder="IFSC Code"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 transition-all bg-white col-span-2"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              Cancel Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelOrderModal;
