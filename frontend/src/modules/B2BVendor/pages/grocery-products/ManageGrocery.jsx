import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiSearch, FiPackage, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import QuotaBanner from '../../components/QuotaBanner';
import DataTable from '../../../Admin/components/DataTable';
import ConfirmModal from '../../../Admin/components/ConfirmModal';

const ManageGrocery = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/grocery/vendor/products');
            if (res.success) {
                setProducts(res.data || []);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to fetch grocery products');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            const res = await api.delete(`/grocery/vendor/products/${productToDelete._id}`);
            if (res.success) {
                toast.success('Grocery product deleted successfully');
                fetchProducts();
            } else {
                toast.error(res.message || 'Failed to delete product');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setDeleteModalOpen(false);
            setProductToDelete(null);
        }
    };

    const filteredProducts = products.filter(p => 
        (p.name || p.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const columns = [
        {
            key: 'image',
            label: 'Image',
            render: (_, row) => (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                    {row.image || row.media?.[0]?.url ? (
                        <img src={row.image || row.media?.[0]?.url} className="w-full h-full object-cover" alt="" />
                    ) : (
                        <FiPackage className="w-full h-full p-3 text-gray-400" />
                    )}
                </div>
            )
        },
        { key: 'name', label: 'Product Name', render: (v, row) => v || row.title },
        { key: 'category', label: 'Category', render: (v) => v?.name || v },
        { key: 'price', label: 'Price (₹)', render: (v, row) => v || row.basePrice || 'N/A' },
        { key: 'isVisible', label: 'Status', render: (v, row) => {
            const isVisible = v !== undefined ? v : row.isVisible !== false;
            return (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {isVisible ? 'Active' : 'Hidden'}
                </span>
            )
        }},
        {
            key: 'actions',
            label: 'Actions',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/b2b-vendor/grocery-products/edit/${row._id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <FiEdit2 size={16} />
                    </button>
                    <button onClick={() => handleDeleteClick(row)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <FiTrash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-6">
            <QuotaBanner action="product" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <FiPackage className="text-primary-600" /> Manage Grocery
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">View and manage your grocery products.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search grocery..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:border-primary-500 text-sm w-full md:w-64"
                        />
                    </div>
                    <button onClick={() => navigate('/b2b-vendor/grocery-products/add-grocery')} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-700 transition-colors flex items-center gap-2 whitespace-nowrap">
                        <FiPlus /> Add New
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <FiPackage className="mx-auto text-6xl text-gray-200 mb-4" />
                        <p className="text-gray-500 font-medium">No grocery products found.</p>
                    </div>
                ) : (
                    <DataTable data={filteredProducts} columns={columns} pagination itemsPerPage={10} />
                )}
            </div>

            {deleteModalOpen && (
                <ConfirmModal
                    isOpen={deleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="Delete Grocery Product"
                    message={`Are you sure you want to delete "${productToDelete?.name || productToDelete?.title}"? This action cannot be undone.`}
                    confirmText="Delete"
                    cancelText="Cancel"
                />
            )}
        </motion.div>
    );
};

export default ManageGrocery;
