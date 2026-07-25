import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiImage, FiArrowLeft, FiUpload } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const B2BCategories = () => {
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // View state: 'list' or 'edit'
    const [view, setView] = useState('list');
    
    // Editor State
    const [treeData, setTreeData] = useState({
        id: null,
        name: '',
        image: null,
        imagePreview: null,
        file: null,
        subCategories: [], // { uiId, id, name, image, imagePreview, file, subSubCategories: [{ uiId, id, name }] }
        originalSubIds: []
    });
    
    const [subSubInput, setSubSubInput] = useState({}); // To hold the input value for each subcategory's sub-sub add field

    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '', inputName: '' });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/b2b-categories');
            if (response.success) {
                const cats = (response.data || []).map(cat => ({
                    ...cat,
                    id: cat._id || cat.id
                }));
                setCategories(cats);
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error(error.response?.data?.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    const openEditor = (rootCategory = null) => {
        if (!rootCategory) {
            setTreeData({ id: null, name: '', image: null, imagePreview: null, file: null, subCategories: [], originalSubIds: [] });
            setView('edit');
            return;
        }

        // The backend returns a nested tree: category.subcategories
        const subs = rootCategory.subcategories || [];
        const builtSubs = subs.map(sub => {
            const subSubs = (sub.subcategories || []).map(ss => ({ 
                uiId: Math.random().toString(), 
                id: ss._id || ss.id, 
                name: ss.name,
                image: ss.image,
                imagePreview: ss.image,
                file: null
            }));
            return {
                uiId: Math.random().toString(),
                id: sub._id || sub.id,
                name: sub.name,
                image: sub.image,
                imagePreview: sub.image,
                file: null,
                fields: sub.fields || [],
                subSubCategories: subSubs,
                originalSubSubIds: subSubs.map(ss => ss.id)
            };
        });

        setTreeData({
            id: rootCategory._id || rootCategory.id,
            name: rootCategory.name,
            image: rootCategory.image,
            imagePreview: rootCategory.image,
            file: null,
            subCategories: builtSubs,
            originalSubIds: builtSubs.map(s => s.id)
        });
        setView('edit');
    };

    // Editor Actions
    const handleRootImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setTreeData(prev => ({
                ...prev,
                file,
                imagePreview: URL.createObjectURL(file)
            }));
        }
    };

    const addSubcategory = () => {
        setTreeData(prev => ({
            ...prev,
            subCategories: [
                ...prev.subCategories,
                { uiId: Math.random().toString(), id: null, name: '', image: null, imagePreview: null, file: null, fields: [], subSubCategories: [] }
            ]
        }));
    };

    const removeSubcategory = (index) => {
        setTreeData(prev => {
            const updated = [...prev.subCategories];
            updated.splice(index, 1);
            return { ...prev, subCategories: updated };
        });
    };

    const updateSubcategory = (index, key, value) => {
        setTreeData(prev => {
            const updated = [...prev.subCategories];
            updated[index][key] = value;
            return { ...prev, subCategories: updated };
        });
    };

    const addSubField = (subIndex) => {
        setTreeData(prev => {
            const subs = [...prev.subCategories];
            subs[subIndex].fields = [...(subs[subIndex].fields || []), { label: '', type: 'text', options: [] }];
            return { ...prev, subCategories: subs };
        });
    };

    const updateSubField = (subIndex, fieldIndex, key, value) => {
        setTreeData(prev => {
            const subs = [...prev.subCategories];
            const fields = [...(subs[subIndex].fields || [])];
            if (key === 'options') {
                fields[fieldIndex].options = value.split(',').map(v => v.trim()).filter(Boolean);
            } else {
                fields[fieldIndex][key] = value;
            }
            subs[subIndex].fields = fields;
            return { ...prev, subCategories: subs };
        });
    };

    const removeSubField = (subIndex, fieldIndex) => {
        setTreeData(prev => {
            const subs = [...prev.subCategories];
            const fields = [...(subs[subIndex].fields || [])];
            fields.splice(fieldIndex, 1);
            subs[subIndex].fields = fields;
            return { ...prev, subCategories: subs };
        });
    };

    const handleImageChange = (index, e) => {
        const file = e.target.files[0];
        if (file) {
            setTreeData(prev => {
                const updated = [...prev.subCategories];
                updated[index].file = file;
                updated[index].imagePreview = URL.createObjectURL(file);
                return { ...prev, subCategories: updated };
            });
        }
    };

    const handleSubSubImage = (subIndex, e) => {
        const file = e.target.files[0];
        if (file) {
            setSubSubInput(prev => ({
                ...prev,
                [subIndex]: {
                    ...prev[subIndex],
                    file,
                    preview: URL.createObjectURL(file)
                }
            }));
        }
    };

    const addSubSubCategory = (subIndex) => {
        const currentInput = subSubInput[subIndex] || {};
        const val = currentInput.name?.trim();
        if (!val) return;
        
        setTreeData(prev => {
            const updatedSubCategories = prev.subCategories.map((sub, idx) => {
                if (idx !== subIndex) return sub;
                return {
                    ...sub,
                    subSubCategories: [
                        ...sub.subSubCategories,
                        {
                            uiId: Math.random().toString(), 
                            id: null, 
                            name: val,
                            file: currentInput.file || null,
                            imagePreview: currentInput.preview || null,
                            image: null
                        }
                    ]
                };
            });
            return { ...prev, subCategories: updatedSubCategories };
        });
        
        setSubSubInput(prev => ({ ...prev, [subIndex]: { name: '', file: null, preview: null } }));
    };

    const removeSubSubCategory = (subIndex, subSubIndex) => {
        setTreeData(prev => {
            const updatedSubCategories = prev.subCategories.map((sub, idx) => {
                if (idx !== subIndex) return sub;
                return {
                    ...sub,
                    subSubCategories: sub.subSubCategories.filter((_, i) => i !== subSubIndex)
                };
            });
            return { ...prev, subCategories: updatedSubCategories };
        });
    };

    // Save Logic
    const saveCategoryTree = async () => {
        if (!treeData.name.trim()) {
            toast.error('Main Category Name is required');
            return;
        }

        setSaving(true);
        try {
            // 1. Save Root Category
            let rootId = treeData.id;
            const rootData = new FormData();
            rootData.append('name', treeData.name.trim());
            rootData.append('level', 1);
            if (treeData.file) rootData.append('image', treeData.file);

            if (!rootId) {
                const res = await api.post('/admin/b2b-categories', rootData);
                rootId = res.data.id || res.data._id;
            } else {
                await api.put(`/admin/b2b-categories/${rootId}`, rootData);
            }

            // 2. Process Subs
            const uiSubIds = treeData.subCategories.map(s => s.id).filter(Boolean);
            const subsToDelete = (treeData.originalSubIds || []).filter(id => !uiSubIds.includes(id));
            
            for (const subId of subsToDelete) {
                await api.delete(`/admin/b2b-categories/${subId}`);
            }

            for (const sub of treeData.subCategories) {
                if (!sub.name.trim()) continue; // Skip empty
                
                let subId = sub.id;
                const subData = new FormData();
                subData.append('name', sub.name.trim());
                subData.append('level', 2);
                subData.append('parent', rootId);
                if (sub.fields && sub.fields.length > 0) {
                    subData.append('fields', JSON.stringify(sub.fields));
                }
                if (sub.file) subData.append('image', sub.file);

                if (!subId) {
                    const res = await api.post('/admin/b2b-categories', subData);
                    subId = res.data.id || res.data._id;
                } else {
                    await api.put(`/admin/b2b-categories/${subId}`, subData);
                }

                // Sub-subcategories
                const uiSubSubIds = sub.subSubCategories.map(ss => ss.id).filter(Boolean);
                const subSubsToDelete = (sub.originalSubSubIds || []).filter(id => !uiSubSubIds.includes(id));
                
                for (const ssId of subSubsToDelete) {
                    await api.delete(`/admin/b2b-categories/${ssId}`);
                }

                for (const ss of sub.subSubCategories) {
                    if (!ss.name.trim()) continue;
                    const ssData = new FormData();
                    ssData.append('name', ss.name.trim());
                    ssData.append('level', 3);
                    ssData.append('parent', subId);
                    if (ss.file) ssData.append('image', ss.file);

                    if (!ss.id) {
                        await api.post('/admin/b2b-categories', ssData);
                    } else {
                        await api.put(`/admin/b2b-categories/${ss.id}`, ssData);
                    }
                }

                // Auto-save any pending sub-subcategory that was typed but not "Added"
                const pendingSubSubIndex = treeData.subCategories.indexOf(sub);
                const pendingSubSub = subSubInput[pendingSubSubIndex];
                if (pendingSubSub && pendingSubSub.name && pendingSubSub.name.trim()) {
                    const ssData = new FormData();
                    ssData.append('name', pendingSubSub.name.trim());
                    ssData.append('level', 3);
                    ssData.append('parent', subId);
                    if (pendingSubSub.file) ssData.append('image', pendingSubSub.file);
                    await api.post('/admin/b2b-categories', ssData);
                }
            }

            toast.success('Category saved successfully!');
            await loadCategories();
            setView('list');
        } catch (error) {
            console.error('Error saving category:', error);
            
            // Extract request details for better debugging
            const config = error.config || {};
            const method = (config.method || '').toUpperCase();
            const url = config.url || '';
            const msg = error.response?.data?.message || error.message || 'Failed to save categories';
            
            toast.error(`Error (${method} ${url}): ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRoot = (category) => {
        setDeleteConfirm({
            show: true,
            id: category.id,
            name: category.name,
            inputName: ''
        });
    };

    const executeDelete = async () => {
        const { id, name, inputName } = deleteConfirm;
        if (inputName !== name) {
            toast.error(`Please type "${name}" correctly to confirm`);
            return;
        }

        try {
            setLoading(true);
            const response = await api.delete(`/admin/b2b-categories/${id}`);
            if (response.success) {
                toast.success('Category deleted');
                setDeleteConfirm({ show: false, id: null, name: '', inputName: '' });
                loadCategories();
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error(error.response?.data?.message || 'Failed to delete category');
        } finally {
            setLoading(false);
        }
    };

    const rootCategories = categories; // The backend already returns only root categories
    const [selectedCategory, setSelectedCategory] = useState(null);

    const toggleCategory = (category) => {
        setSelectedCategory(prev => prev?.id === category.id ? null : category);
    };

    return (
        <div className="p-6 space-y-6">
            {view === 'list' && (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm"
                            />
                        </div>

                        <button
                            onClick={() => openEditor()}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg"
                        >
                            <FiPlus /> Add New Category
                        </button>
                    </div>

                    {/* List */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[500px]">
                        {loading && categories.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                <p className="mt-4 text-gray-500 font-bold">Loading categories...</p>
                            </div>
                        ) : rootCategories.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-300">
                                    <FiPlus className="text-2xl text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">No Categories</h3>
                                <p className="text-gray-500 mb-6 font-medium">Start by adding a root category.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {rootCategories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(category => {
                                    const isExpanded = selectedCategory?.id === category.id;
                                    const subs = category.subcategories || [];
                                    return (
                                        <div key={category.id}>
                                            {/* Category Row */}
                                            <div
                                                onClick={() => toggleCategory(category)}
                                                className={`flex items-center justify-between p-4 bg-white border shadow-sm rounded-xl cursor-pointer transition-all select-none ${
                                                    isExpanded ? 'border-blue-400 ring-2 ring-blue-100 rounded-b-none' : 'border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    {category.image ? (
                                                        <img src={category.image} alt={category.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100 border" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-gray-50 border flex items-center justify-center text-gray-400">
                                                            <FiImage />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 text-lg">{category.name}</h3>
                                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-semibold">
                                                            {subs.length} Subcategories
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditor(category); }}
                                                        className="px-4 py-2 bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 rounded-lg flex items-center gap-2"
                                                    >
                                                        <FiEdit2 className="text-sm" /> Manage
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRoot(category); }}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                                    >
                                                        <FiTrash2 className="text-sm" />
                                                    </button>
                                                    <span className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        ▾
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Expanded Subcategory Panel */}
                                            {isExpanded && (
                                                <div className="border border-t-0 border-blue-400 rounded-b-xl bg-gray-50 p-5 ring-2 ring-blue-100 ring-t-0">
                                                    {subs.length === 0 ? (
                                                        <div className="text-center py-8">
                                                            <p className="text-gray-400 font-medium">No subcategories yet. Click <strong>Manage</strong> to add some.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {subs.map((sub, idx) => {
                                                                const subSubs = sub.subcategories || [];
                                                                return (
                                                                    <div key={sub._id || idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <div className="flex items-center gap-2 min-w-0">
                                                                                {sub.image && (
                                                                                    <img src={sub.image} alt={sub.name} className="w-8 h-8 rounded-lg object-cover border flex-shrink-0" />
                                                                                )}
                                                                                <h4 className="font-bold text-gray-800 text-sm leading-tight truncate">{sub.name}</h4>
                                                                            </div>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); openEditor(category); }}
                                                                                className="ml-2 p-1 text-blue-400 hover:text-blue-600 flex-shrink-0"
                                                                                title="Edit"
                                                                            >
                                                                                <FiEdit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                        {subSubs.length > 0 && (
                                                                            <>
                                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sub-subcategories</p>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {subSubs.slice(0, 4).map((ss, i) => (
                                                                                        <span key={i} className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-semibold">
                                                                                            {ss.name}
                                                                                        </span>
                                                                                    ))}
                                                                                    {subSubs.length > 4 && (
                                                                                        <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-semibold">
                                                                                            +{subSubs.length - 4} more
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                        {subSubs.length === 0 && (
                                                                            <p className="text-xs text-gray-400 mt-1">No sub-subcategories</p>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'edit' && (
                <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900">
                            <FiArrowLeft /> Back to List
                        </button>
                        <button onClick={saveCategoryTree} disabled={saving} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save All Changes'}
                        </button>
                    </div>

                    {/* General Information Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">General Information</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={treeData.name}
                                    onChange={(e) => setTreeData({ ...treeData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-gray-800"
                                    placeholder="e.g. Marble"
                                />
                            </div>
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    <span>Thumbnail Media</span>
                                    <span className="text-blue-600 cursor-pointer hover:underline relative">
                                        UPLOAD
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleRootImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="text"
                                        readOnly
                                        value={treeData.file ? treeData.file.name : (treeData.image || '')}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-500 overflow-hidden text-ellipsis"
                                        placeholder="No file chosen"
                                    />
                                    {treeData.imagePreview && (
                                        <img src={treeData.imagePreview} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subcategories Card */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">Subcategories</h2>
                            <button onClick={addSubcategory} className="px-4 py-2 border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 rounded-full flex items-center gap-2 text-sm">
                                <FiPlus /> ADD NEW
                            </button>
                        </div>

                        <div className="space-y-6">
                            {treeData.subCategories.length === 0 && (
                                <p className="text-gray-500 text-center py-8">No subcategories added yet.</p>
                            )}
                            
                            {treeData.subCategories.map((sub, index) => (
                                <div key={sub.uiId} className="p-6 bg-slate-50/50 rounded-2xl border border-gray-100 relative group">
                                    <button 
                                        onClick={() => removeSubcategory(index)}
                                        className="absolute -right-3 -top-3 w-8 h-8 bg-white border border-gray-200 text-red-500 hover:text-red-600 hover:border-red-200 rounded-full flex items-center justify-center shadow-sm"
                                    >
                                        <FiX />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subcategory Name</label>
                                            <input
                                                type="text"
                                                value={sub.name}
                                                onChange={(e) => updateSubcategory(index, 'name', e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium text-gray-800"
                                                placeholder="e.g. Indian Marble"
                                            />
                                        </div>
                                        <div>
                                            <label className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                <span>Thumbnail Media</span>
                                                <span className="text-blue-600 cursor-pointer hover:underline relative">
                                                    UPLOAD
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => handleImageChange(index, e)}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </span>
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={sub.file ? sub.file.name : (sub.image || '')}
                                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-500 overflow-hidden text-ellipsis"
                                                    placeholder="No file chosen"
                                                />
                                                {sub.imagePreview && (
                                                    <img src={sub.imagePreview} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-gray-200 shadow-sm" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Subcategory Fields Section */}
                                    <div className="mb-6 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-purple-900 uppercase tracking-wider">Subcategory Fields</h4>
                                            <button 
                                                onClick={() => addSubField(index)}
                                                className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1"
                                            >
                                                <FiPlus /> Field
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            {(sub.fields || []).length === 0 && (
                                                <p className="text-xs text-purple-400 italic">No fields defined for this subcategory. Add fields to allow vendors to specify details like Size, Color, Material, etc.</p>
                                            )}
                                            {(sub.fields || []).map((field, fIdx) => (
                                                <div key={fIdx} className="flex flex-wrap md:flex-nowrap items-start gap-3 bg-white p-3 rounded-xl border border-purple-100 shadow-sm relative pr-10">
                                                    <button 
                                                        onClick={() => removeSubField(index, fIdx)}
                                                        className="absolute right-3 top-3 text-red-400 hover:text-red-600"
                                                    >
                                                        <FiX />
                                                    </button>
                                                    <div className="flex-1 min-w-[200px]">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Label (e.g. Size)" 
                                                            value={field.label}
                                                            onChange={(e) => updateSubField(index, fIdx, 'label', e.target.value)}
                                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none"
                                                        />
                                                    </div>
                                                    <div className="w-[120px]">
                                                        <select 
                                                            value={field.type}
                                                            onChange={(e) => updateSubField(index, fIdx, 'type', e.target.value)}
                                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none"
                                                        >
                                                            <option value="text">Text</option>
                                                            <option value="number">Number</option>
                                                            <option value="select">Select</option>
                                                            <option value="multi-select">Multi-Select</option>
                                                        </select>
                                                    </div>
                                                    {(field.type === 'select' || field.type === 'multi-select') && (
                                                        <div className="flex-[2] min-w-[250px]">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Options (comma separated)" 
                                                                value={(field.options || []).join(', ')}
                                                                onChange={(e) => updateSubField(index, fIdx, 'options', e.target.value)}
                                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 mb-3">Sub-subcategories</h4>
                                        
                                        <div className="flex flex-wrap items-center gap-3">
                                            {sub.subSubCategories.map((ss, ssIndex) => (
                                                <div key={ss.uiId} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                                                    {ss.imagePreview ? (
                                                        <img src={ss.imagePreview} alt={ss.name} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-xs">
                                                            <FiImage />
                                                        </div>
                                                    )}
                                                    <span className="text-sm font-semibold text-gray-700">{ss.name}</span>
                                                    <button onClick={() => removeSubSubCategory(index, ssIndex)} className="text-red-400 hover:text-red-600 ml-1">
                                                        <FiX className="text-sm" />
                                                    </button>
                                                </div>
                                            ))}
                                            
                                            <div className="w-full mt-2 flex flex-col gap-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add Sub-subcategory</div>
                                                <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
                                                    <input
                                                        type="text"
                                                        value={subSubInput[index]?.name || ''}
                                                        onChange={(e) => setSubSubInput({ ...subSubInput, [index]: { ...subSubInput[index], name: e.target.value } })}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addSubSubCategory(index);
                                                            }
                                                        }}
                                                        placeholder="Sub-subcategory name..."
                                                        className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-gray-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                                                    />
                                                    
                                                    <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer text-sm whitespace-nowrap">
                                                        <FiImage />
                                                        <span className="font-medium">{subSubInput[index]?.file ? 'Change Image' : 'Upload Image'}</span>
                                                        <input 
                                                            type="file" 
                                                            accept="image/*"
                                                            onChange={(e) => handleSubSubImage(index, e)}
                                                            className="hidden"
                                                        />
                                                    </label>

                                                    <button 
                                                        onClick={() => addSubSubCategory(index)}
                                                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
                                                    >
                                                        <FiPlus /> Add
                                                    </button>
                                                </div>
                                                {subSubInput[index]?.preview && (
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-gray-500 font-medium">Image ready:</span>
                                                        <img src={subSubInput[index].preview} alt="preview" className="w-10 h-10 rounded object-cover border border-gray-200 shadow-sm" />
                                                        <span className="text-xs text-gray-400">{subSubInput[index].file.name}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm.show && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                                <FiTrash2 className="text-3xl text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Category</h2>
                            <p className="text-gray-500 mb-6 font-medium">
                                You are about to delete "{deleteConfirm.name}". This will delete all subcategories inside it!
                            </p>
                            
                            <div className="w-full text-left space-y-2 mb-6">
                                <label className="text-xs font-bold text-gray-500 uppercase">Type name to confirm</label>
                                <input
                                    type="text"
                                    value={deleteConfirm.inputName}
                                    onChange={(e) => setDeleteConfirm(prev => ({ ...prev, inputName: e.target.value }))}
                                    placeholder={deleteConfirm.name}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                                />
                            </div>

                            <div className="flex gap-4 w-full">
                                <button onClick={() => setDeleteConfirm({ show: false, id: null, name: '', inputName: '' })} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">
                                    Cancel
                                </button>
                                <button onClick={executeDelete} disabled={deleteConfirm.inputName !== deleteConfirm.name || loading} className={`flex-1 py-3 rounded-xl font-bold text-white ${deleteConfirm.inputName === deleteConfirm.name ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300'}`}>
                                    {loading ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            , document.body)}
        </div>
    );
};

export default B2BCategories;
