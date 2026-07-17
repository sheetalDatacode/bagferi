import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const Zones = () => {
    const [zones, setZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingZone, setEditingZone] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        city: 'Surat', // Fixed as requested
        pincode: '',
        area: '',
        market: '',
        isActive: true
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        try {
            const response = await api.get('/zones/admin');
            if (response.success) {
                setZones(response.data);
            }
        } catch (error) {
            console.error('Error fetching zones:', error);
            toast.error('Failed to fetch zones');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (zone = null) => {
        if (zone) {
            setEditingZone(zone);
            setFormData({
                name: zone.name,
                city: zone.city || 'Surat',
                pincode: zone.pincode,
                area: zone.area,
                market: zone.market,
                isActive: zone.isActive
            });
        } else {
            setEditingZone(null);
            setFormData({
                name: '',
                city: 'Surat',
                pincode: '',
                area: '',
                market: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let response;
            if (editingZone) {
                response = await api.put(`/zones/admin/${editingZone._id}`, formData);
            } else {
                response = await api.post('/zones/admin', formData);
            }

            if (response.success) {
                toast.success(response.message || 'Zone saved successfully');
                setIsModalOpen(false);
                fetchZones();
            } else {
                toast.error(response.message || 'Failed to save zone');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving zone');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this zone?')) return;
        
        try {
            const response = await api.delete(`/zones/admin/${id}`);
            if (response.success) {
                toast.success('Zone deleted successfully');
                fetchZones();
            } else {
                toast.error(response.message || 'Failed to delete zone');
            }
        } catch (error) {
            toast.error('Error deleting zone');
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const response = await api.put(`/zones/admin/${id}`, { isActive: !currentStatus });
            if (response.success) {
                toast.success('Zone status updated');
                fetchZones();
            }
        } catch (error) {
            toast.error('Error updating status');
        }
    };

    const filteredZones = zones.filter(zone => 
        zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.market.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.pincode.includes(searchQuery)
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Zones Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage city zones for vendor store selection</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                    <FiPlus />
                    <span>Add Zone</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[250px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, area, market, or pincode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4">Zone Name</th>
                                <th className="px-6 py-4">City</th>
                                <th className="px-6 py-4">Pincode</th>
                                <th className="px-6 py-4">Area</th>
                                <th className="px-6 py-4">Market</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        Loading zones...
                                    </td>
                                </tr>
                            ) : filteredZones.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No zones found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredZones.map((zone) => (
                                    <tr key={zone._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{zone.name}</td>
                                        <td className="px-6 py-4">{zone.city}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{zone.pincode}</td>
                                        <td className="px-6 py-4">{zone.area}</td>
                                        <td className="px-6 py-4">{zone.market}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatus(zone._id, zone.isActive)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                    zone.isActive 
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                                }`}
                                            >
                                                {zone.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(zone)}
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Edit Zone"
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(zone._id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Zone"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div key="zone-modal-overlay" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                        <motion.div
                            key="zone-modal-content"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
                        >
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingZone ? 'Edit Zone' : 'Add New Zone'}
                                </h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="e.g. Surat South Zone"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            readOnly
                                            value={formData.city}
                                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Currently restricted to Surat</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.pincode}
                                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                                placeholder="e.g. 395002"
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Area <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.area}
                                                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                                placeholder="e.g. Ring Road"
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Market <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.market}
                                            onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                                            placeholder="e.g. Millennium Textile Market"
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                                        />
                                    </div>

                                    <label className="flex items-center gap-3 cursor-pointer pt-2">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="h-5 w-5 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 font-medium">Zone is Active</span>
                                    </label>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            'Save Zone'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Zones;
