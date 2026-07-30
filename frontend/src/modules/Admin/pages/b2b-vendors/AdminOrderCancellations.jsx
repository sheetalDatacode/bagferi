import React, { useState, useEffect } from 'react';
import { FiCheck, FiClock, FiDollarSign, FiUser, FiInfo, FiSearch, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const AdminOrderCancellations = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [processingId, setProcessingId] = useState(null);
  const [notesText, setNotesText] = useState({});

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/cancellation-refunds', { params: { status: filterStatus } });
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load cancellation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id, status) => {
    try {
      setProcessingId(id);
      const adminNotes = notesText[id] || '';
      const res = await api.put(`/admin/cancellation-refunds/${id}/process`, { status, adminNotes });
      if (res.success) {
        toast.success(res.message);
        fetchRequests();
      } else {
        toast.error(res.message || 'Failed to process refund');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to process refund');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 font-sans text-gray-800 text-left">
      <div>
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">
          Manual Refund Requests (Bank/UPI)
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Review and process manual bank transfers/UPI refunds for customer-cancelled B2B orders.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 border border-gray-200 overflow-x-auto whitespace-nowrap max-w-fit">
        {['pending', 'processing', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
              filterStatus === status
                ? 'bg-white shadow-sm text-indigo-700 border border-gray-200/50'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center space-y-2">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
            <FiCheck className="text-xl text-gray-400" />
          </div>
          <p className="text-xs font-bold text-gray-900">No requests found</p>
          <p className="text-[11px] text-gray-400 font-medium">
            There are currently no manual refund requests in this category.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Customer Details</th>
                  <th className="p-4">Refund Amount</th>
                  <th className="p-4">Refund Destination (Bank/UPI)</th>
                  {filterStatus === 'pending' && <th className="p-4">Admin Action Notes</th>}
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req._id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">#{req.orderNumber}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{req.userId?.name || 'N/A'}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{req.userId?.phone || 'N/A'}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-black text-gray-900">₹{req.refundAmount}</span>
                    </td>
                    <td className="p-4">
                      <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50 max-w-xs space-y-1">
                        {req.bankDetails?.upiId ? (
                          <p className="font-bold text-indigo-700">UPI ID: <span className="font-medium text-slate-800">{req.bankDetails.upiId}</span></p>
                        ) : req.bankDetails?.accountNumber ? (
                          <>
                            <p className="font-bold text-indigo-700">Name: <span className="font-medium text-slate-800">{req.bankDetails.accountHolderName}</span></p>
                            <p className="font-bold text-indigo-700">A/c: <span className="font-medium text-slate-800">{req.bankDetails.accountNumber}</span></p>
                            <p className="font-bold text-indigo-700">IFSC: <span className="font-medium text-slate-800">{req.bankDetails.ifscCode}</span></p>
                            {req.bankDetails?.bankName && <p className="font-bold text-indigo-700">Bank: <span className="font-medium text-slate-800">{req.bankDetails.bankName}</span></p>}
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">No bank/UPI details provided</span>
                        )}
                      </div>
                    </td>
                    {filterStatus === 'pending' && (
                      <td className="p-4">
                        <input
                          type="text"
                          placeholder="Reference No. / Notes..."
                          value={notesText[req._id] || ''}
                          onChange={(e) => setNotesText({ ...notesText, [req._id]: e.target.value })}
                          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-500 w-full"
                        />
                      </td>
                    )}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {filterStatus === 'pending' && (
                          <>
                            <button
                              disabled={processingId === req._id}
                              onClick={() => handleProcess(req._id, 'processing')}
                              className="px-2.5 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                            >
                              In Process
                            </button>
                            <button
                              disabled={processingId === req._id}
                              onClick={() => handleProcess(req._id, 'completed')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                            >
                              Complete Refund
                            </button>
                          </>
                        )}
                        {filterStatus === 'processing' && (
                          <button
                            disabled={processingId === req._id}
                            onClick={() => handleProcess(req._id, 'completed')}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                          >
                            Mark Completed
                          </button>
                        )}
                        {filterStatus === 'completed' && (
                          <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                            <FiCheckCircle /> Refunded
                          </span>
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
    </div>
  );
};

export default AdminOrderCancellations;
