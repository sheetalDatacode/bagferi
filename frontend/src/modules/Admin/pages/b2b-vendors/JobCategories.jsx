import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../../shared/utils/api';
import ConfirmModal from '../../components/ConfirmModal';

const AdminJobCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCategory, setCurrentCategory] = useState({ name: '', subcategories: [], order: 0, isActive: true });
    const [newSubcategory, setNewSubcategory] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/job-categories');
            if (response.success) {
                setCategories(response.data);
            }
        } catch (error) {
            toast.error('Failed to load categories');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCategory = async () => {
        if (!currentCategory.name.trim()) return toast.error('Category name is required');
        
        try {
            if (currentCategory._id) {
                const res = await api.put(`/admin/job-categories/${currentCategory._id}`, currentCategory);
                if (res.success) toast.success('Category updated');
            } else {
                const res = await api.post('/admin/job-categories', currentCategory);
                if (res.success) toast.success('Category created');
            }
            setIsEditing(false);
            setCurrentCategory({ name: '', subcategories: [], order: 0, isActive: true });
            fetchCategories();
        } catch (error) {
            toast.error(error.message || 'Failed to save category');
        }
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;
        try {
            const res = await api.delete(`/admin/job-categories/${categoryToDelete}`);
            if (res.success) {
                toast.success('Category deleted');
                fetchCategories();
            }
        } catch (error) {
            toast.error('Failed to delete category');
        } finally {
            setDeleteModalOpen(false);
            setCategoryToDelete(null);
        }
    };

    const addSubcategory = () => {
        if (!newSubcategory.trim()) return;
        if (currentCategory.subcategories.includes(newSubcategory.trim())) {
            return toast.error('Subcategory already exists');
        }
        setCurrentCategory({
            ...currentCategory,
            subcategories: [...currentCategory.subcategories, newSubcategory.trim()]
        });
        setNewSubcategory('');
    };

    const removeSubcategory = (index) => {
        const newSubs = [...currentCategory.subcategories];
        newSubs.splice(index, 1);
        setCurrentCategory({ ...currentCategory, subcategories: newSubs });
    };

    const openEditModal = (cat = null) => {
        if (cat) {
            setCurrentCategory({ ...cat });
        } else {
            setCurrentCategory({ name: '', subcategories: [], order: 0, isActive: true });
        }
        setIsEditing(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Job Categories</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage categories and job roles</p>
                </div>
                <button
                    onClick={() => openEditModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 transition-colors"
                >
                    <FiPlus /> Add Category
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {categories.map((category) => (
                    <motion.div key={category._id} whileHover={{ y: -4 }} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{category.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${category.isActive ? 'text-green-600' : 'text-red-500'}`}>
                                        {category.isActive ? <><FiCheckCircle /> Active</> : <><FiXCircle /> Inactive</>}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order: {category.order}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(category)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                                    <FiEdit2 />
                                </button>
                                <button onClick={() => { setCategoryToDelete(category._id); setDeleteModalOpen(true); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Subcategories ({category.subcategories.length})</p>
                            <div className="flex flex-wrap gap-2">
                                {category.subcategories.map((sub, i) => (
                                    <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg">
                                        {sub}
                                    </span>
                                ))}
                                {category.subcategories.length === 0 && <span className="text-xs text-gray-400 italic">No subcategories</span>}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {isEditing && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-4 border-b border-slate-50 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{currentCategory._id ? 'Edit Category' : 'New Category'}</h2>
                            <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-500 rounded-full transition-colors"><FiX size={20}/></button>
                        </div>

                        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={currentCategory.name}
                                    onChange={(e) => setCurrentCategory({...currentCategory, name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary-500/40 outline-none"
                                    placeholder="e.g. Real Estate"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Display Order</label>
                                    <input
                                        type="number"
                                        value={currentCategory.order}
                                        onChange={(e) => setCurrentCategory({...currentCategory, order: parseInt(e.target.value) || 0})}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary-500/40 outline-none"
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-3">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" className="sr-only" checked={currentCategory.isActive} onChange={(e) => setCurrentCategory({...currentCategory, isActive: e.target.checked})} />
                                            <div className={`block w-14 h-8 rounded-full transition-colors ${currentCategory.isActive ? 'bg-primary-500' : 'bg-slate-300'}`}></div>
                                            <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentCategory.isActive ? 'transform translate-x-6' : ''}`}></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Active</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Subcategories</label>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={newSubcategory}
                                        onChange={(e) => setNewSubcategory(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addSubcategory()}
                                        className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-primary-500/40 outline-none"
                                        placeholder="Add a job role..."
                                    />
                                    <button onClick={addSubcategory} className="px-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-colors">Add</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {currentCategory.subcategories.map((sub, i) => (
                                        <span key={i} className="flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 text-xs font-bold rounded-lg">
                                            {sub}
                                            <button onClick={() => removeSubcategory(i)} className="text-primary-400 hover:text-red-500"><FiX /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-50 bg-slate-50/50">
                            <button onClick={handleSaveCategory} className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200">
                                Save Category
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteCategory}
                title="Delete Category"
                message="Are you sure you want to delete this job category? This cannot be undone."
                confirmText="Delete Category"
                type="danger"
            />
        </div>
    );
};

export default AdminJobCategories;
