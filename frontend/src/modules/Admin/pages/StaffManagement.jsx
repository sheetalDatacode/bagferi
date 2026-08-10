import React, { useState, useEffect } from 'react';
import { FiUsers, FiSearch, FiBriefcase, FiPhone, FiEye, FiUser, FiX } from 'react-icons/fi';
import api from '../../../shared/utils/api';
import toast from 'react-hot-toast';

const StaffManagement = () => {
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingDocUrl, setViewingDocUrl] = useState(null);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/staff');
            if (res.success) {
                setStaffList(res.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const filteredStaff = staffList.filter(staff => {
        const query = searchTerm.toLowerCase();
        return (
            staff.name?.toLowerCase().includes(query) ||
            staff.post?.toLowerCase().includes(query) ||
            staff.mobile?.toLowerCase().includes(query) ||
            staff.vendorName?.toLowerCase().includes(query) ||
            staff.shopName?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <FiUsers className="text-primary-600" />
                        Vendor Staff Management
                    </h1>
                    <p className="text-xs text-gray-500 font-medium mt-1">View all staff profiles registered by B2B vendors</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Staff, Role, Mobile or Vendor..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                    <FiUsers className="text-6xl text-gray-200 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-900">No Staff Found</h3>
                    <p className="text-gray-500">There are no staff profiles registered matching your query.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Staff Member</th>
                                    <th className="px-6 py-4">Role / Post</th>
                                    <th className="px-6 py-4">Mobile / Contact</th>
                                    <th className="px-6 py-4">Vendor (Store Name)</th>
                                    <th className="px-6 py-4 text-center">Identity Proof</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStaff.map((staff, idx) => (
                                    <tr key={staff._id || idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <FiUser />
                                                </div>
                                                {staff.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-semibold uppercase text-xs">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-black">
                                                {staff.post || 'Delivery Boy'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-gray-700">
                                            {staff.mobile}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-black text-primary-600">{staff.vendorName}</p>
                                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{staff.shopName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {staff.identityDocumentUrl ? (
                                                <button 
                                                    onClick={() => setViewingDocUrl(staff.identityDocumentUrl)}
                                                    className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:underline"
                                                >
                                                    <FiEye /> View Document
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">No Document</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* View Document Modal */}
            {viewingDocUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-xl shadow-2xl relative border border-slate-100 flex flex-col animate-scale-up">
                        <button
                            onClick={() => setViewingDocUrl(null)}
                            className="absolute top-5 right-5 p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                        >
                            <FiX size={18} />
                        </button>
                        
                        <h3 className="text-base font-black text-gray-900 mb-4 uppercase tracking-tight">
                            Identity Proof Document
                        </h3>

                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-2 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
                            <img 
                                src={viewingDocUrl} 
                                alt="Staff Identity Document" 
                                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-sm"
                            />
                        </div>

                        <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-2">
                            <a 
                                href={viewingDocUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                            >
                                Open In New Tab
                            </a>
                            <button
                                onClick={() => setViewingDocUrl(null)}
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

export default StaffManagement;
