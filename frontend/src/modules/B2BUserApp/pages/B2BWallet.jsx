import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiClock, FiPlusCircle, FiArrowUpRight, FiArrowDownLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import B2BHeader from '../components/Layout/B2BHeader';
import B2BBottomNav from '../components/Layout/B2BBottomNav';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const B2BWallet = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get('/order/wallet/balance');
      if (res.success && res.data) {
        setBalance(res.data.balance || 0);
        setTransactions(res.data.transactions || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch wallet details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-20 md:pb-0 font-sans text-gray-800">
      <B2BHeader />

      <div className="max-w-md mx-auto p-4 md:p-6 lg:py-8 space-y-6">
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-wider"
        >
          <FiArrowLeft /> Back
        </button>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl" />

          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Available Wallet Balance
          </p>
          <h2 className="text-4xl font-black mt-2 tracking-tight">
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h2>

          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <span>Bagferi B2B Wallet</span>
            <span className="bg-indigo-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[9px] text-indigo-300">
              Active
            </span>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest text-left">
            Transaction History
          </h3>

          {loading ? (
            <div className="flex justify-center py-10 bg-white rounded-2xl border border-gray-100">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center space-y-2">
              <p className="text-xs font-bold text-gray-900">No Transactions Yet</p>
              <p className="text-[11px] text-gray-400 font-medium">
                Refunds and credits to your wallet will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-sm">
              {transactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <div key={tx._id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-3 text-left">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {isCredit ? <FiArrowDownLeft size={16} /> : <FiArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 line-clamp-1">{tx.description || 'Wallet Transaction'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-black ${isCredit ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {isCredit ? '+' : '-'} ₹{tx.amount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <B2BBottomNav />
      </div>
    </div>
  );
};

export default B2BWallet;
