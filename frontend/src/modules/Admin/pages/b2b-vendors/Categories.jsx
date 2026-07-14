import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiSave } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const B2BCategories = () => {
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingSubcategory, setEditingSubcategory] = useState({ categoryId: null, index: null });
    const [addingSubcategory, setAddingSubcategory] = useState(null); // Track which category is adding subcategory
    const [newSubcategoryName, setNewSubcategoryName] = useState(''); // Store new subcategory name
    const [deleteConfirm, setDeleteConfirm] = useState({ 
        show: false, 
        type: null, 
        id: null, 
        name: '', 
        parentId: null,
        inputName: '' 
    });

    const [formData, setFormData] = useState({
        categoryName: '',
        subcategoryName: '',
    });

    const [fields, setFields] = useState([
        { label: "", type: "text", options: [], required: false }
    ]);

    const addField = () => setFields([...fields, { label: "", type: "text", options: [], required: false }]);

    const updateField = (i, key, val) => {
        const updated = [...fields];
        updated[i][key] = val;
        setFields(updated);
    };

    const updateOption = (i, idx, val) => {
        const updated = [...fields];
        updated[i].options[idx] = val;
        setFields(updated);
    };

    const addOption = i => {
        const updated = [...fields];
        const currentOptions = updated[i].options || [];
        updated[i].options = [...currentOptions, ""];
        setFields(updated);
    };

    const removeOption = (fieldIdx, optIdx) => {
        const updated = [...fields];
        updated[fieldIdx].options = updated[fieldIdx].options.filter((_, idx) => idx !== optIdx);
        setFields(updated);
    };

    const removeField = (index) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        if (showAddForm || deleteConfirm.show) {
            document.documentElement.classList.add('no-scroll');
            document.body.classList.add('no-scroll');
        } else {
            document.documentElement.classList.remove('no-scroll');
            document.body.classList.remove('no-scroll');
        }
        return () => {
            document.documentElement.classList.remove('no-scroll');
            document.body.classList.remove('no-scroll');
        };
    }, [showAddForm, deleteConfirm.show]);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/b2b-categories');
            if (response.success) {
                // Map _id to id for frontend compatibility
                const categories = (response.data || []).map(cat => ({
                    ...cat,
                    id: cat._id || cat.id
                }));
                setCategories(categories);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error(error.response?.data?.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };


    const handleAddCategory = async () => {
        if (!formData.categoryName.trim()) {
            toast.error('Category name is required');
            return;
        }
        if (!formData.subcategoryName.trim()) {
            toast.error('Subcategory name is required');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/admin/b2b-categories', {
                name: formData.categoryName.trim(),
                subcategoryName: formData.subcategoryName.trim(),
                fields
            });
            if (response.success) {
                toast.success('Category added successfully');
                setFormData({ categoryName: '', subcategoryName: '', fields: [] });
                setShowAddForm(false);
                loadCategories();
            }
        } catch (error) {
            console.error('Error adding category:', error);
            toast.error(error.response?.data?.message || 'Failed to add category');
        } finally {
            setLoading(false);
        }
    };

    const handleStartAddSubcategory = (categoryId) => {
        setAddingSubcategory(categoryId);
        setNewSubcategoryName('');
        setFields([{ label: "", type: "text", options: [], required: false }]); // Correctly reset the fields state
    };

    const handleCancelAddSubcategory = () => {
        setAddingSubcategory(null);
        setNewSubcategoryName('');
        setFormData(prev => ({ ...prev, fields: [] }));
    };

    const handleAddSubcategory = async (categoryId) => {
        if (!newSubcategoryName.trim()) {
            toast.error('Subcategory name is required');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post(`/admin/b2b-categories/${categoryId}/subcategories`, {
                subcategoryName: newSubcategoryName.trim(),
                fields
            });
            if (response.success) {
                toast.success('Subcategory added');
                setAddingSubcategory(null);
                setNewSubcategoryName('');
                setFormData(prev => ({ ...prev, fields: [] }));
                loadCategories();
            }
        } catch (error) {
            console.error('Error adding subcategory:', error);
            toast.error(error.response?.data?.message || 'Failed to add subcategory');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (categoryId, categoryName) => {
        setDeleteConfirm({
            show: true,
            type: 'category',
            id: categoryId,
            name: categoryName,
            parentId: null,
            inputName: ''
        });
    };

    const handleDeleteSubcategory = async (categoryId, subcategoryName) => {
        setDeleteConfirm({
            show: true,
            type: 'subcategory',
            id: subcategoryName, // For subcategory, 'id' is the name in this specific API
            name: subcategoryName,
            parentId: categoryId,
            inputName: ''
        });
    };

    const executeDelete = async () => {
        const { type, id, name, parentId, inputName } = deleteConfirm;
        
        if (inputName !== name) {
            toast.error(`Please type "${name}" correctly to confirm`);
            return;
        }

        try {
            setLoading(true);
            let response;
            if (type === 'category') {
                response = await api.delete(`/admin/b2b-categories/${id}`);
            } else {
                response = await api.delete(`/admin/b2b-categories/${parentId}/subcategories`, {
                    data: { subcategoryName: name }
                });
            }

            if (response.success) {
                toast.success(`${type === 'category' ? 'Category' : 'Subcategory'} deleted`);
                setDeleteConfirm({ show: false, type: null, id: null, name: '', parentId: null, inputName: '' });
                loadCategories();
            }
        } catch (error) {
            console.error(`Error deleting ${type}:`, error);
            toast.error(error.response?.data?.message || `Failed to delete ${type}`);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEditCategory = (category) => {
        setEditingCategory({ id: category.id, name: category.name });
    };

    const handleSaveCategoryEdit = async () => {
        if (!editingCategory.name.trim()) {
            toast.error('Category name cannot be empty');
            return;
        }
        try {
            setLoading(true);
            const response = await api.put(`/admin/b2b-categories/${editingCategory.id}`, {
                name: editingCategory.name.trim()
            });
            if (response.success) {
                toast.success('Category updated');
                setEditingCategory(null);
                loadCategories();
            }
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error(error.response?.data?.message || 'Failed to update category');
        } finally {
            setLoading(false);
        }
    };

    const handleStartEditSubcategory = (categoryId, subcategory, index) => {
        setEditingSubcategory({
            categoryId,
            index,
            name: subcategory.name,
        });
        // Populate the shared fields state for editing
        if (subcategory.fields && subcategory.fields.length > 0) {
            setFields(subcategory.fields.map(f => ({
                label: f.label || "",
                type: f.type || "text",
                options: f.options ? [...f.options] : [],
                required: !!f.required
            })));
        } else {
            setFields([{ label: "", type: "text", options: [], required: false }]);
        }
    };

    const handleSaveSubcategoryEdit = async () => {
        if (!editingSubcategory.name.trim()) {
            toast.error('Subcategory name cannot be empty');
            return;
        }
        try {
            setLoading(true);
            const response = await api.patch(`/admin/b2b-categories/${editingSubcategory.categoryId}/subcategories`, {
                index: editingSubcategory.index,
                newName: editingSubcategory.name.trim(),
                fields: fields // Use the shared fields state
            });
            if (response.success) {
                toast.success('Subcategory updated');
                setEditingSubcategory({ categoryId: null, index: null });
                loadCategories();
            }
        } catch (error) {
            console.error('Error updating subcategory:', error);
            toast.error(error.response?.data?.message || 'Failed to update subcategory');
        } finally {
            setLoading(false);
        }
    };

    const filteredCategories = categories.filter(category => {
        const searchLower = searchTerm.toLowerCase();
        const matchesCategory = category.name?.toLowerCase().includes(searchLower);
        const matchesSubcategory = category.subcategories?.some(sub => 
            sub.name?.toLowerCase().includes(searchLower)
        );
        return matchesCategory || matchesSubcategory;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search categories or subcategories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-80 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100 shadow-sm"
                    />
                </div>

                <button
                    onClick={() => {
                        setFields([{ label: "", type: "text", options: [], required: false }]);
                        setShowAddForm(true);
                    }}
                    className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg"
                >
                    <FiPlus /> Add Category
                </button>
            </div>

            {/* Modals Container */}
            {createPortal(
                <AnimatePresence>
                    {showAddForm && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-8"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-gray-800">Add New Category</h2>
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setFormData({ categoryName: '', subcategoryName: '' });
                                            setFields([{ label: "", type: "text", options: [], required: false }]);
                                        }}
                                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"
                                    >
                                        <FiX className="text-xl" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Category Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.categoryName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, categoryName: e.target.value }))}
                                            placeholder="e.g., Electronics"
                                            className="w-full px-4 py-3.5 text-base font-semibold text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100 shadow-sm"
                                            autoFocus
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Subcategory Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.subcategoryName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, subcategoryName: e.target.value }))}
                                            placeholder="e.g., Smart Devices"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-100 shadow-sm"
                                        />
                                    </div>

                                    {/* Fields Manager in Modal */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-sm font-bold text-gray-800">Dynamic Fields</label>
                                            <button
                                                type="button"
                                                onClick={addField}
                                                className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                                            >
                                                <FiPlus /> Add Field
                                            </button>
                                        </div>

                                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 text-left">
                                            {fields.map((field, idx) => (
                                                <div key={idx} className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200 relative group">
                                                    <button
                                                        onClick={() => removeField(idx)}
                                                        className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <FiX />
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => updateField(idx, 'label', e.target.value)}
                                                            placeholder="Label (e.g. Fabric)"
                                                            className="px-3 py-2.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary-400"
                                                        />
                                                        <select
                                                            value={field.type}
                                                            onChange={(e) => updateField(idx, 'type', e.target.value)}
                                                            className="px-3 py-2.5 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg outline-none focus:border-primary-400"
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="select">Select</option>
                                                            <option value="multi-select">Multi-Select</option>
                                                        </select>
                                                    </div>
                                                    {(field.type === 'select' || field.type === 'multi-select') && (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-gray-400 font-bold">Options</span>
                                                                <button onClick={() => addOption(idx)} className="text-[10px] text-primary-600">+ Add Option</button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(field.options || []).map((opt, optIdx) => (
                                                                    <div key={optIdx} className="relative group/opt">
                                                                        <input
                                                                            type="text"
                                                                            value={opt}
                                                                            onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                                                            className="px-2 py-1 text-[10px] bg-white border border-gray-200 rounded w-20 pr-5"
                                                                            placeholder={`Opt ${optIdx + 1}`}
                                                                        />
                                                                        <button
                                                                            onClick={() => removeOption(idx, optIdx)}
                                                                            className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                                                                        >
                                                                            <FiX size={10} />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setFormData({ categoryName: '', subcategoryName: '' });
                                            setFields([{ label: "", type: "text", options: [], required: false }]);
                                        }}
                                        className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddCategory}
                                        className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 shadow-md shadow-primary-200"
                                    >
                                        Add Category
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {createPortal(
                <AnimatePresence>
                    {deleteConfirm.show && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl border border-red-50"
                            >
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                        <FiTrash2 className="text-4xl text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Serious Action Required</h2>
                                    <p className="text-gray-500 mb-8 font-medium">
                                        You are about to delete <span className="text-red-600 font-bold">"{deleteConfirm.name}"</span>. 
                                        This action is permanent and will affect all associated products.
                                    </p>
                                    
                                    <div className="w-full text-left space-y-3 mb-8">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Type name to confirm</label>
                                        <input
                                            type="text"
                                            value={deleteConfirm.inputName}
                                            onChange={(e) => setDeleteConfirm(prev => ({ ...prev, inputName: e.target.value }))}
                                            placeholder={deleteConfirm.name}
                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-red-500 focus:bg-white transition-all outline-none font-bold text-gray-900 shadow-inner dark:placeholder:text-gray-300"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex gap-4 w-full">
                                        <button
                                            onClick={() => setDeleteConfirm({ show: false, type: null, id: null, name: '', parentId: null, inputName: '' })}
                                            className="flex-1 px-4 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={executeDelete}
                                            disabled={deleteConfirm.inputName !== deleteConfirm.name || loading}
                                            className={`flex-1 px-4 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg ${
                                                deleteConfirm.inputName === deleteConfirm.name 
                                                ? 'bg-red-600 text-white shadow-red-200 hover:bg-red-700' 
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            }`}
                                        >
                                            {loading ? 'Deleting...' : 'Delete Forever'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Loading State */}
            {loading && categories.length === 0 && (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-gray-500">Loading categories...</p>
                </div>
            )}

            {/* Categories List */}
            {!loading && categories.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiPlus className="text-3xl text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Categories Yet</h3>
                    <p className="text-gray-500 mb-6">Start by adding your first category</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="px-6 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700"
                    >
                        Add Category
                    </button>
                </div>
            ) : !loading ? (
                <>
                {filteredCategories.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                        <p className="text-gray-500 font-medium">No categories found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCategories.map((category) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all"
                        >
                            {/* Category Header */}
                            <div className="flex items-start justify-between mb-4">
                                {editingCategory?.id === category.id ? (
                                    <div className="flex-1 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={editingCategory.name}
                                            onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-lg font-bold"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleSaveCategoryEdit}
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                        >
                                            <FiCheck className="text-lg" />
                                        </button>
                                        <button
                                            onClick={() => setEditingCategory(null)}
                                            className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"
                                        >
                                            <FiX className="text-lg" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-xl font-bold text-gray-800 flex-1">{category.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleStartEditCategory(category)}
                                                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                                                title="Edit Category"
                                            >
                                                <FiEdit2 className="text-sm" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                title="Delete Category"
                                            >
                                                <FiTrash2 className="text-sm" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Subcategories List */}
                            <div className="space-y-4 mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Subcategories</span>
                                    {addingSubcategory !== category.id && (
                                        <button
                                            onClick={() => handleStartAddSubcategory(category.id)}
                                            className="text-xs text-primary-600 font-bold hover:underline flex items-center gap-1"
                                        >
                                            <FiPlus className="text-xs" /> Add
                                        </button>
                                    )}
                                </div>

                                {/* Add Subcategory UI (Extended with Fields) */}
                                {addingSubcategory === category.id && (
                                    <div className="space-y-3 p-4 bg-primary-50 border border-primary-200 rounded-2xl mb-4">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={newSubcategoryName}
                                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                                placeholder="Subcategory Name..."
                                                className="w-full px-3 py-2 bg-white border border-primary-300 rounded-xl text-sm font-bold shadow-sm"
                                                autoFocus
                                            />
                                        </div>

                                        {/* Dynamic Fields for new subcat */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-primary-700 uppercase">Subcategory Fields</span>
                                                <button onClick={addField} className="text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full font-bold">+ Field</button>
                                            </div>
                                            {fields.map((f, i) => (
                                                <div key={i} className="flex flex-col gap-1 bg-white/50 p-2 rounded-lg border border-primary-100">
                                                    <div className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            placeholder="Label"
                                                            className="flex-1 px-2 py-1.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 bg-white border border-gray-200 rounded-lg outline-none"
                                                            value={f.label}
                                                            onChange={(e) => updateField(i, 'label', e.target.value)}
                                                        />
                                                        <select
                                                            className="flex-1 px-2 py-1.5 text-sm font-semibold text-gray-900 bg-white border border-gray-200 rounded-lg outline-none"
                                                            value={f.type}
                                                            onChange={(e) => updateField(i, 'type', e.target.value)}
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="number">Num</option>
                                                            <option value="select">Sel</option>
                                                            <option value="multi-select">Multi</option>
                                                        </select>
                                                        <button onClick={() => removeField(i)} className="text-red-400"><FiX size={10} /></button>
                                                    </div>
                                                    {(f.type === 'select' || f.type === 'multi-select') && (
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {f.options.map((opt, optIdx) => (
                                                                <div key={optIdx} className="relative group/opt">
                                                                    <input
                                                                        type="text"
                                                                        value={opt}
                                                                        onChange={(e) => updateOption(i, optIdx, e.target.value)}
                                                                        className="px-2.5 py-1.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-lg w-20 bg-white outline-none pr-7"
                                                                        placeholder="Opt"
                                                                    />
                                                                    <button
                                                                        onClick={() => removeOption(i, optIdx)}
                                                                        className="absolute right-0.5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/opt:opacity-100"
                                                                    >
                                                                        <FiX size={8} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            <button onClick={() => addOption(i)} className="text-[8px] text-primary-600 font-bold hover:underline">+ Opt</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAddSubcategory(category.id)}
                                                className="flex-1 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold shadow-sm"
                                            >
                                                Save Subcategory
                                            </button>
                                            <button
                                                onClick={handleCancelAddSubcategory}
                                                className="px-3 py-1.5 bg-white text-gray-400 rounded-lg text-xs border border-gray-200"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {category.subcategories && category.subcategories.length > 0 ? (
                                    <div className="space-y-2">
                                        {category.subcategories.map((sub, index) => (
                                            <div
                                                key={index}
                                                className="flex flex-col p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all"
                                            >
                                                <div className="flex items-center justify-between">
                                                    {editingSubcategory.categoryId === category.id && editingSubcategory.index === index ? (
                                                        <div className="flex-1 space-y-3 p-4 bg-primary-50/50 border border-primary-100 rounded-2xl">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={editingSubcategory.name}
                                                                    onChange={(e) => setEditingSubcategory(prev => ({ ...prev, name: e.target.value }))}
                                                                    className="flex-1 px-3 py-2 bg-white border border-primary-200 rounded-xl text-sm font-bold shadow-sm"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={handleSaveSubcategoryEdit}
                                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-xl border border-transparent hover:border-green-200 transition-all shadow-sm"
                                                                    title="Save Changes"
                                                                >
                                                                    <FiCheck className="text-lg" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingSubcategory({ categoryId: null, index: null });
                                                                        setFields([{ label: "", type: "text", options: [], required: false }]);
                                                                    }}
                                                                    className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl border border-gray-200"
                                                                    title="Cancel"
                                                                >
                                                                    <FiX className="text-lg" />
                                                                </button>
                                                            </div>

                                                            {/* Dynamic Fields Editor for Edit Mode */}
                                                            <div className="space-y-2 pt-2 border-t border-primary-100/50">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black text-primary-700 uppercase">Edit Fields</span>
                                                                    <button onClick={addField} className="text-[10px] bg-primary-600 text-white px-2 py-0.5 rounded-full font-bold">+ Field</button>
                                                                </div>
                                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                                    {fields.map((f, i) => (
                                                                        <div key={i} className="flex flex-col gap-1 bg-white/80 p-2 rounded-xl border border-primary-100 shadow-sm">
                                                                            <div className="flex gap-1 items-center">
                                                                                <input
                                                                                    type="text"
                                                                                    placeholder="Label"
                                                                                    className="w-1/2 text-[10px] bg-transparent border-none outline-none focus:ring-0"
                                                                                    value={f.label}
                                                                                    onChange={(e) => updateField(i, 'label', e.target.value)}
                                                                                />
                                                                                <select
                                                                                    className="w-1/2 text-[10px] bg-transparent border-none outline-none font-bold"
                                                                                    value={f.type}
                                                                                    onChange={(e) => updateField(i, 'type', e.target.value)}
                                                                                >
                                                                                    <option value="text">Text</option>
                                                                                    <option value="number">Num</option>
                                                                                    <option value="select">Sel</option>
                                                                                    <option value="multi-select">Multi</option>
                                                                                </select>
                                                                                <button
                                                                                    onClick={() => removeField(i)}
                                                                                    className="text-red-400 hover:bg-red-50 p-1 rounded"
                                                                                >
                                                                                    <FiX size={10} />
                                                                                </button>
                                                                            </div>
                                                                            {(f.type === 'select' || f.type === 'multi-select') && (
                                                                                <div className="flex flex-wrap gap-2 mt-1 pt-1 border-t border-gray-50">
                                                                                    {f.options.map((opt, optIdx) => (
                                                                                        <div key={optIdx} className="relative group/opt">
                                                                                            <input
                                                                                                key={optIdx}
                                                                                                type="text"
                                                                                                value={opt}
                                                                                                onChange={(e) => updateOption(i, optIdx, e.target.value)}
                                                                                                className="px-2.5 py-1.5 text-sm font-semibold text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-lg w-20 bg-white outline-none focus:border-primary-400 pr-7"
                                                                                                placeholder="Option"
                                                                                            />
                                                                                            <button
                                                                                                onClick={() => removeOption(i, optIdx)}
                                                                                                className="absolute right-1 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 opacity-0 group-hover/opt:opacity-100"
                                                                                            >
                                                                                                <FiX size={8} />
                                                                                            </button>
                                                                                        </div>
                                                                                    ))}
                                                                                    <button onClick={() => addOption(i)} className="text-[8px] text-primary-600 font-bold hover:underline">+ Opt</button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-sm font-bold text-gray-700">{sub.name}</span>
                                                                <span className="text-[10px] text-gray-400 font-medium">
                                                                    {sub.fields?.length || 0} fields defined
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button
                                                                    onClick={() => handleStartEditSubcategory(category.id, sub, index)}
                                                                    className="p-1.5 text-primary-600 hover:bg-white rounded-lg shadow-sm"
                                                                    title="Edit"
                                                                >
                                                                    <FiEdit2 className="text-[10px]" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteSubcategory(category.id, sub.name)}
                                                                    className="p-1.5 text-red-600 hover:bg-white rounded-lg shadow-sm"
                                                                    title="Delete"
                                                                >
                                                                    <FiTrash2 className="text-[10px]" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Preview fields */}
                                                {(editingSubcategory.categoryId !== category.id || editingSubcategory.index !== index) && sub.fields?.length > 0 && (
                                                    <div className="mt-2 flex flex-wrap gap-1">
                                                        {sub.fields.slice(0, 3).map((f, i) => (
                                                            <span key={i} className="text-xs bg-white px-2.5 py-1 rounded-lg border border-gray-200 text-gray-900 uppercase font-black tracking-widest">
                                                                {f.label}
                                                            </span>
                                                        ))}
                                                        {sub.fields.length > 3 && <span className="text-xs text-gray-500 font-semibold">+{sub.fields.length - 3} more</span>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic py-2">No subcategories yet</p>
                                )}
                            </div>
                        </motion.div>
                    ))}
                    </div>
                )}
                </>
            ) : null}
        </div>
    );
};

export default B2BCategories;
