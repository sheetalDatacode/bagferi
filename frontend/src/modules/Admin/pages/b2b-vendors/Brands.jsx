import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiSearch, FiArrowLeft, FiImage } from 'react-icons/fi';
import { motion } from 'framer-motion';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

const Brands = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    
    // View state
    const [view, setView] = useState('list'); // list or edit
    
    // Editor State
    const [formData, setFormData] = useState({
        id: null,
        name: '',
        type: 'fashion',
        categories: [],
        subcategories: [],
        imagePreview: null,
        file: null,
        isActive: true
    });
    
    // Data for dropdowns
    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [catSearch, setCatSearch] = useState('');
    const [subSearch, setSubSearch] = useState('');

    useEffect(() => {
        loadBrands();
    }, [typeFilter]);

    const loadBrands = async () => {
        try {
            setLoading(true);
            const query = typeFilter ? `?type=${typeFilter}` : '';
            const res = await api.get(`/brands${query}`);
            if (res.success) setBrands(res.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load brands');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async (type) => {
        try {
            const url = type === 'fashion' ? '/admin/b2b-categories' : '/grocery/categories';
            const res = await api.get(url);
            if (res.success) {
                setCategories(res.data || []);
            }
        } catch (error) {
            toast.error('Failed to load categories');
        }
    };

    useEffect(() => {
        if (view === 'edit') {
            loadCategories(formData.type);
        }
    }, [formData.type, view]);

    useEffect(() => {
        if (formData.categories.length > 0 && categories.length > 0) {
            const selectedCats = categories.filter(c => formData.categories.includes(c._id || c.id));
            const allSubs = selectedCats.flatMap(c => c.subcategories || []);
            
            // Remove duplicates
            const uniqueSubs = Array.from(new Map(allSubs.map(item => [item._id || item.id, item])).values());
            setSubcategories(uniqueSubs);
            
            // Validate current subcategories
            if (formData.subcategories.length > 0) {
                const validSubcategories = formData.subcategories.filter(subId => 
                    uniqueSubs.some(s => (s._id || s.id) === subId)
                );
                if (validSubcategories.length !== formData.subcategories.length) {
                    setFormData(prev => ({ ...prev, subcategories: validSubcategories }));
                }
            }
        } else {
            setSubcategories([]);
            setFormData(prev => ({ ...prev, subcategories: [] }));
        }
    }, [formData.categories, categories]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                file,
                imagePreview: URL.createObjectURL(file)
            }));
        }
    };

    const openEditor = (brand = null) => {
        setCatSearch('');
        setSubSearch('');
        if (brand) {
            setFormData({
                id: brand._id,
                name: brand.name,
                type: brand.type,
                categories: brand.categories || (brand.category ? [brand.category] : []),
                subcategories: brand.subcategories || (brand.subcategory ? [brand.subcategory] : []),
                imagePreview: brand.logo,
                file: null,
                isActive: brand.isActive
            });
        } else {
            setFormData({
                id: null,
                name: '',
                type: 'fashion',
                categories: [],
                subcategories: [],
                imagePreview: null,
                file: null,
                isActive: true
            });
        }
        setView('edit');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.type || formData.categories.length === 0) {
            toast.error('Name, Type, and at least one Category are required');
            return;
        }

        try {
            setSaving(true);
            const fd = new FormData();
            fd.append('name', formData.name);
            fd.append('type', formData.type);
            fd.append('categories', JSON.stringify(formData.categories));
            if (formData.subcategories.length > 0) fd.append('subcategories', JSON.stringify(formData.subcategories));
            fd.append('isActive', formData.isActive);
            if (formData.file) fd.append('logo', formData.file);

            if (formData.id) {
                await api.put(`/brands/${formData.id}`, fd);
                toast.success('Brand updated');
            } else {
                await api.post('/brands', fd);
                toast.success('Brand created');
            }
            loadBrands();
            setView('list');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save brand');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this brand?')) return;
        try {
            await api.delete(`/brands/${id}`);
            toast.success('Brand deleted');
            loadBrands();
        } catch (error) {
            toast.error('Failed to delete brand');
        }
    };

    const filteredBrands = brands.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
            {view === 'list' && (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Brand Management</h1>
                            <p className="text-gray-500 font-medium mt-1">Manage product brands across modules</p>
                        </div>
                        <button
                            onClick={() => openEditor()}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                            <FiPlus /> Add Brand
                        </button>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search brands..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-gray-700 min-w-[200px]"
                        >
                            <option value="">All Types</option>
                            <option value="fashion">Fashion</option>
                            <option value="grocery">Grocery</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-gray-500 font-bold">Loading brands...</div>
                        ) : filteredBrands.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 font-bold">No brands found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100">
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Brand</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredBrands.map(brand => (
                                            <tr key={brand._id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        {brand.logo ? (
                                                            <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 p-1" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                                                                <FiImage />
                                                            </div>
                                                        )}
                                                        <span className="font-bold text-gray-900">{brand.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
                                                        brand.type === 'fashion' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                        {brand.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
                                                        brand.isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {brand.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openEditor(brand)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(brand._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {view === 'edit' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-600 font-bold hover:text-gray-900">
                            <FiArrowLeft /> Back to List
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
                            {formData.id ? 'Edit Brand' : 'Create New Brand'}
                        </h2>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Module Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value, categories: [], subcategories: [] })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-gray-700"
                                    >
                                        <option value="fashion">Fashion</option>
                                        <option value="grocery">Grocery</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand Name *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold text-gray-800"
                                        placeholder="e.g. Nike"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Category *</label>
                                    <div className="mb-2 relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search categories..."
                                            value={catSearch}
                                            onChange={e => setCatSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-sm"
                                        />
                                    </div>
                                    <div className="w-full h-32 overflow-y-auto px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 space-y-2">
                                        {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).map(c => (
                                            <label key={c._id || c.id} className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.categories.includes(c._id || c.id)}
                                                    onChange={(e) => {
                                                        const id = c._id || c.id;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            categories: e.target.checked 
                                                                ? [...prev.categories, id]
                                                                : prev.categories.filter(catId => catId !== id)
                                                        }));
                                                    }}
                                                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{c.name}</span>
                                            </label>
                                        ))}
                                        {categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase())).length === 0 && (
                                            <span className="text-sm font-bold text-gray-400">No categories found</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subcategory (Optional)</label>
                                    <div className="mb-2 relative">
                                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search subcategories..."
                                            value={subSearch}
                                            onChange={e => setSubSearch(e.target.value)}
                                            disabled={!formData.categories.length || subcategories.length === 0}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-sm disabled:opacity-50"
                                        />
                                    </div>
                                    <div className={`w-full h-32 overflow-y-auto px-4 py-3 border rounded-xl space-y-2 transition-colors ${!formData.categories.length || subcategories.length === 0 ? 'bg-gray-100 border-gray-200 opacity-70' : 'bg-gray-50 border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100'}`}>
                                        {subcategories.filter(c => c.name.toLowerCase().includes(subSearch.toLowerCase())).map(c => (
                                            <label key={c._id || c.id} className="flex items-center gap-3 cursor-pointer group">
                                                <input 
                                                    type="checkbox"
                                                    checked={formData.subcategories.includes(c._id || c.id)}
                                                    onChange={(e) => {
                                                        const id = c._id || c.id;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            subcategories: e.target.checked 
                                                                ? [...prev.subcategories, id]
                                                                : prev.subcategories.filter(subId => subId !== id)
                                                        }));
                                                    }}
                                                    disabled={!formData.categories.length || subcategories.length === 0}
                                                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                                                />
                                                <span className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">{c.name}</span>
                                            </label>
                                        ))}
                                        {(!formData.categories.length || subcategories.length === 0) ? (
                                            <span className="text-sm font-bold text-gray-400">No subcategories available</span>
                                        ) : subcategories.filter(c => c.name.toLowerCase().includes(subSearch.toLowerCase())).length === 0 ? (
                                            <span className="text-sm font-bold text-gray-400">No subcategories found</span>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Brand Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                                        {formData.imagePreview ? (
                                            <img src={formData.imagePreview} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <FiImage className="text-gray-400 text-2xl" />
                                        )}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-700 mb-1">Upload Brand Logo</p>
                                        <p className="text-xs text-gray-500">Square image recommended. Max 2MB.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setView('list')}
                                    className="px-6 py-3 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg disabled:opacity-50 transition-colors"
                                >
                                    {saving ? 'Saving...' : 'Save Brand'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Brands;
