import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiImage, FiArrowLeft, FiUpload } from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const GroceryCategories = () => {
    const [categories, setCategories] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    
    // View state: 'list' or 'edit'
    const [view, setView] = useState('list');
    
    // Editor State
    const [treeData, setTreeData] = useState({
        id: null,
        name: '',
        image: null,
        imagePreview: null,
        file: null,
        subCategories: [], 
        originalSubIds: []
    }); 

    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '', inputName: '' });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await api.get('/grocery/categories');
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

        const subs = rootCategory.subcategories || [];
        const builtSubs = subs.map(sub => {
            return {
                uiId: Math.random().toString(),
                id: sub._id || sub.id,
                name: sub.name,
                image: sub.image,
                imagePreview: sub.image,
                file: null,
                fields: sub.fields || []
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

    const toggleCategory = (cat) => {
        if (selectedCategory?.id === cat.id) {
            setSelectedCategory(null);
        } else {
            setSelectedCategory(cat);
        }
    };

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
                { uiId: Math.random().toString(), id: null, name: '', image: null, imagePreview: null, file: null, fields: [] }
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



    const saveCategoryTree = async () => {
        if (!treeData.name.trim()) {
            toast.error('Main Category Name is required');
            return;
        }

        setSaving(true);
        try {
            let rootId = treeData.id;
            const rootData = new FormData();
            rootData.append('name', treeData.name.trim());
            rootData.append('level', 1);
            if (treeData.file) rootData.append('image', treeData.file);

            if (!rootId) {
                const res = await api.post('/grocery/categories', rootData);
                rootId = res.data.id || res.data._id || res.data.data._id;
            } else {
                await api.put(`/grocery/categories/${rootId}`, rootData);
            }

            const uiSubIds = treeData.subCategories.map(s => s.id).filter(Boolean);
            const subsToDelete = (treeData.originalSubIds || []).filter(id => !uiSubIds.includes(id));
            
            for (const subId of subsToDelete) {
                await api.delete(`/grocery/categories/${subId}`);
            }

            for (const sub of treeData.subCategories) {
                if (!sub.name.trim()) continue; 
                
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
                    const res = await api.post('/grocery/categories', subData);
                    subId = res.data.id || res.data._id || res.data.data._id;
                } else {
                    await api.put(`/grocery/categories/${subId}`, subData);
                }

            }

            toast.success('Category saved successfully!');
            await loadCategories();
            setView('list');
        } catch (error) {
            console.error('Error saving category:', error);
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
            const response = await api.delete(`/grocery/categories/${id}`);
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

    const rootCategories = categories;

    return (
        <div className="p-6 space-y-6">
            {view === 'list' && (
                <>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="relative w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Search grocery categories..."
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
                                                onClick={() => { setSelectedCategory(category); setView('detail'); }}
                                                className={`flex items-center justify-between p-4 bg-white border border-gray-200 shadow-sm rounded-xl cursor-pointer transition-all select-none hover:border-blue-300 hover:shadow-md group`}
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
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'detail' && selectedCategory && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div>
                            <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-bold hover:text-gray-900 mb-2">
                                <FiArrowLeft /> Back to Categories
                            </button>
                            <h1 className="text-2xl font-black text-gray-900">{selectedCategory.name}</h1>
                            <p className="text-gray-500 font-medium text-sm">Welcome back! Here's your business overview.</p>
                        </div>
                        <button
                            onClick={() => openEditor(selectedCategory)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm"
                        >
                            <FiEdit2 className="inline mr-2" /> Manage Category
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-6 pb-4 items-start min-h-[50vh]">
                        {(selectedCategory.subcategories || []).map((sub, idx) => {
                            const fields = sub.fields || [];
                            return (
                                <div key={sub._id || idx} className="w-[320px] flex-shrink-0 bg-gray-50/50 rounded-2xl p-5 border border-gray-200 shadow-sm">
                                    <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                                        <div className="flex items-center gap-3">
                                            {sub.image && (
                                                <img src={sub.image} alt={sub.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-sm" />
                                            )}
                                            <h3 className="text-lg font-black text-gray-800 tracking-tight">{sub.name}</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => openEditor(selectedCategory)} className="text-blue-500 hover:text-blue-700"><FiEdit2 size={14} /></button>
                                            <button onClick={() => openEditor(selectedCategory)} className="text-red-500 hover:text-red-700"><FiTrash2 size={14} /></button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            {fields.length > 0 ? (
                                                <>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{fields.length} fields defined</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {fields.map((f, fi) => (
                                                            <span key={fi} className="text-[11px] px-2.5 py-1 bg-white border border-gray-200 rounded-md text-gray-700 font-black uppercase tracking-wider shadow-sm">
                                                                {f.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No fields defined</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {(selectedCategory.subcategories || []).length === 0 && (
                            <div className="w-full text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <p className="text-gray-500 font-bold">No subcategories yet. Click "Manage Category" to add some.</p>
                            </div>
                        )}
                    </div>
                </div>
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
                                    placeholder="e.g. Fresh Produce"
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
                                                placeholder="e.g. Vegetables"
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

                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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

export default GroceryCategories;
