import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus, FiTrash2, FiEdit2, FiX, FiImage, FiArrowLeft,
    FiSave, FiChevronRight, FiCheck, FiLoader, FiLayers, FiTag
} from 'react-icons/fi';
import api from '../../../../shared/utils/api';
import toast from 'react-hot-toast';

/* ─────────────── CONSTANTS ─────────────── */
const FIELD_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'select', label: 'Select' },
    { value: 'multi-select', label: 'Multi-Select' },
];

/* ─────────────── HELPERS ─────────────── */
const uid = () => Math.random().toString(36).slice(2);

/* ─────────────── TAG INPUT COMPONENT ─────────────── */
// Props: options (string[]), onChange (fn called with new string[]), placeholder
const TagInput = ({ options = [], onChange, placeholder = 'Type & press Enter…' }) => {
    const [input, setInput] = useState('');

    const addTag = (val) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        if (!options.includes(trimmed)) {
            onChange([...options, trimmed]);
        }
        setInput('');
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && input === '' && options.length > 0) {
            onChange(options.slice(0, -1));
        }
    };

    const removeTag = (idx) => {
        onChange(options.filter((_, i) => i !== idx));
    };

    return (
        <div className="w-full border border-gray-200 rounded-lg bg-gray-50 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            {/* Tags row */}
            {options.length > 0 && (
                <div className="flex flex-wrap gap-1 px-2 pt-2">
                    {options.map((opt, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full"
                        >
                            {opt}
                            <button
                                type="button"
                                onClick={() => removeTag(i)}
                                className="text-indigo-400 hover:text-indigo-700 leading-none ml-0.5"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}
            {/* Input */}
            <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                onBlur={() => addTag(input)}
                placeholder={options.length === 0 ? placeholder : 'Add another…'}
                className="w-full px-2.5 py-1.5 bg-transparent text-xs outline-none placeholder-gray-400"
            />
            <p className="px-2.5 pb-1.5 text-[9px] text-gray-400">Press Enter or comma to add</p>
        </div>
    );
};

/* ─────────────── COMPONENT ─────────────── */
const B2BCategories = () => {
    /* ── Data ── */
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    /* ── Views: 'list' | 'detail' ── */
    const [view, setView] = useState('list');
    const [activeCategory, setActiveCategory] = useState(null);

    /* ── Root modal (add/edit level-1) ── */
    const [rootModal, setRootModal] = useState({ open: false, id: null, name: '', file: null, preview: null, existingImage: null, saving: false });

    /* ── Delete confirm ── */
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '', input: '' });

    /* ── Column state: keyed by subCategory._id ── */
    // addForm: { open, name, fields:[{uiId, label, type, options:[]}], saving }
    const [colAddForms, setColAddForms] = useState({});

    // editSubSub: { subSubId, name, fields, saving }
    const [colEditForms, setColEditForms] = useState({});  // keyed by subId

    /* ── Sub delete ── */
    const [subDeleteConfirm, setSubDeleteConfirm] = useState({ show: false, id: null, name: '', input: '', parentId: null, isSubSub: false });

    const rootImgRef = useRef();

    /* ─── Load ─── */
    useEffect(() => { loadCategories(); }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/b2b-categories');
            if (res.success) {
                setCategories((res.data || []).map(c => ({ ...c, id: c._id || c.id })));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    /* ─── Refresh active category (re-fetch from loaded list) ─── */
    const refreshActiveCategory = async () => {
        await loadCategories();
    };

    /* ─── After save, update activeCategory from fresh list ─── */
    const refreshActive = async (catId) => {
        await loadCategories();
        // Re-fetch the active category fresh
        try {
            const res = await api.get('/admin/b2b-categories');
            if (res.success) {
                const fresh = (res.data || []).find(c => (c._id || c.id) === catId);
                if (fresh) setActiveCategory(fresh);
            }
        } catch (_) { /* ignore */ }
    };

    /* ══════════════════════════════════════════
       ROOT CATEGORY MODAL (Level 1)
    ══════════════════════════════════════════ */
    const openAddRoot = () => {
        setRootModal({ open: true, id: null, name: '', file: null, preview: null, existingImage: null, saving: false });
    };
    const openEditRoot = (cat, e) => {
        e && e.stopPropagation();
        setRootModal({ open: true, id: cat._id || cat.id, name: cat.name, file: null, preview: cat.image, existingImage: cat.image, saving: false });
    };
    const closeRootModal = () => setRootModal(p => ({ ...p, open: false }));

    const handleRootFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setRootModal(p => ({ ...p, file, preview: URL.createObjectURL(file) }));
    };

    const saveRoot = async () => {
        if (!rootModal.name.trim()) return toast.error('Category name is required');
        setRootModal(p => ({ ...p, saving: true }));
        try {
            const fd = new FormData();
            fd.append('name', rootModal.name.trim());
            fd.append('level', 1);
            if (rootModal.file) fd.append('image', rootModal.file);

            if (!rootModal.id) {
                await api.post('/admin/b2b-categories', fd);
                toast.success('Category created!');
            } else {
                await api.put(`/admin/b2b-categories/${rootModal.id}`, fd);
                toast.success('Category updated!');
            }
            closeRootModal();
            await loadCategories();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Save failed');
        } finally {
            setRootModal(p => ({ ...p, saving: false }));
        }
    };

    /* ══════════════════════════════════════════
       DETAIL VIEW — open category
    ══════════════════════════════════════════ */
    const openDetail = (cat) => {
        setActiveCategory(cat);
        setColAddForms({});
        setColEditForms({});
        setView('detail');
    };

    /* ══════════════════════════════════════════
       COLUMN ADD FORM (create subcategory OR sub-sub)
       Each column has colAddForms[subId] = { open, mode:'sub'|'subsub', subSubId:null, name, fields, saving }
    ══════════════════════════════════════════ */
    const openColAdd = (subId) => {
        setColAddForms(p => ({
            ...p,
            [subId]: { open: true, mode: 'subsub', name: '', fields: [], file: null, preview: null, saving: false }
        }));
    };

    const closeColAdd = (subId) => {
        setColAddForms(p => ({ ...p, [subId]: { ...p[subId], open: false } }));
    };

    const updateColAddForm = (subId, patch) => {
        setColAddForms(p => ({ ...p, [subId]: { ...p[subId], ...patch } }));
    };

    /* Fields for add form */
    const addFieldToColForm = (subId) => {
        setColAddForms(p => {
            const form = p[subId] || {};
            return { ...p, [subId]: { ...form, fields: [...(form.fields || []), { uiId: uid(), label: '', type: 'text', options: [] }] } };
        });
    };
    const updateColFormField = (subId, uiId, key, value) => {
        setColAddForms(p => {
            const form = { ...p[subId] };
            form.fields = form.fields.map(f => f.uiId !== uiId ? f : {
                ...f,
                [key]: value
            });
            return { ...p, [subId]: form };
        });
    };
    const removeColFormField = (subId, uiId) => {
        setColAddForms(p => {
            const form = { ...p[subId] };
            form.fields = form.fields.filter(f => f.uiId !== uiId);
            return { ...p, [subId]: form };
        });
    };

    const saveSubSub = async (subId) => {
        const form = colAddForms[subId];
        if (!form?.name?.trim()) return toast.error('Sub-subcategory name is required');
        updateColAddForm(subId, { saving: true });
        try {
            const fd = new FormData();
            fd.append('name', form.name.trim());
            fd.append('level', 3);
            fd.append('parent', subId);
            if (form.file) fd.append('image', form.file);
            if (form.fields && form.fields.length > 0) {
                fd.append('fields', JSON.stringify(form.fields.map(({ label, type, options }) => ({ label, type, options }))));
            }
            await api.post('/admin/b2b-categories', fd);
            toast.success('Sub-subcategory added!');
            closeColAdd(subId);
            await refreshActive(activeCategory._id || activeCategory.id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            updateColAddForm(subId, { saving: false });
        }
    };

    /* ══════════════════════════════════════════
       COLUMN EDIT FORMS (edit sub-sub / subcategory)
    ══════════════════════════════════════════ */
    const openSubSubEdit = (subId, ss) => {
        setColEditForms(p => ({
            ...p,
            [subId]: {
                subSubId: ss._id || ss.id,
                name: ss.name,
                fields: (ss.fields || []).map(f => ({ ...f, uiId: uid(), options: f.options || [] })),
                saving: false,
                open: true,
                file: null,
                preview: ss.image || null,
                existingImage: ss.image || null
            }
        }));
    };

    const closeSubSubEdit = (subId) => {
        setColEditForms(p => ({ ...p, [subId]: { ...p[subId], open: false } }));
    };

    const updateEditForm = (subId, patch) => {
        setColEditForms(p => ({ ...p, [subId]: { ...p[subId], ...patch } }));
    };

    const addFieldToEditForm = (subId) => {
        setColEditForms(p => {
            const form = { ...p[subId] };
            form.fields = [...(form.fields || []), { uiId: uid(), label: '', type: 'text', options: [] }];
            return { ...p, [subId]: form };
        });
    };
    const updateEditFormField = (subId, uiId, key, value) => {
        setColEditForms(p => {
            const form = { ...p[subId] };
            form.fields = form.fields.map(f => f.uiId !== uiId ? f : {
                ...f,
                [key]: value
            });
            return { ...p, [subId]: form };
        });
    };
    const removeEditFormField = (subId, uiId) => {
        setColEditForms(p => {
            const form = { ...p[subId] };
            form.fields = form.fields.filter(f => f.uiId !== uiId);
            return { ...p, [subId]: form };
        });
    };

    const saveSubSubEdit = async (subId) => {
        const form = colEditForms[subId];
        if (!form?.name?.trim()) return toast.error('Name is required');
        updateEditForm(subId, { saving: true });
        try {
            const fd = new FormData();
            fd.append('name', form.name.trim());
            fd.append('level', 3);
            fd.append('parent', subId);
            if (form.file) fd.append('image', form.file);
            if (form.fields && form.fields.length > 0) {
                fd.append('fields', JSON.stringify(form.fields.map(({ label, type, options }) => ({ label, type, options }))));
            }
            await api.put(`/admin/b2b-categories/${form.subSubId}`, fd);
            toast.success('Updated!');
            closeSubSubEdit(subId);
            await refreshActive(activeCategory._id || activeCategory.id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update');
        } finally {
            updateEditForm(subId, { saving: false });
        }
    };

    /* ══════════════════════════════════════════
       EDIT SUBCATEGORY (level 2) — open a sub edit form in the column header
    ══════════════════════════════════════════ */
    const [subEditForms, setSubEditForms] = useState({}); // keyed by subId

    const openSubEdit = (sub, e) => {
        e && e.stopPropagation();
        const subId = sub._id || sub.id;
        setSubEditForms(p => ({
            ...p,
            [subId]: {
                open: true,
                name: sub.name,
                file: null,
                preview: sub.image || null,
                existingImage: sub.image || null,
                saving: false
            }
        }));
    };

    const closeSubEdit = (subId) => {
        setSubEditForms(p => ({ ...p, [subId]: { ...p[subId], open: false } }));
    };

    const saveSubEdit = async (subId) => {
        const form = subEditForms[subId];
        if (!form?.name?.trim()) return toast.error('Name is required');
        setSubEditForms(p => ({ ...p, [subId]: { ...p[subId], saving: true } }));
        try {
            const fd = new FormData();
            fd.append('name', form.name.trim());
            if (form.file) fd.append('image', form.file);
            await api.put(`/admin/b2b-categories/${subId}`, fd);
            toast.success('Subcategory updated!');
            closeSubEdit(subId);
            await refreshActive(activeCategory._id || activeCategory.id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setSubEditForms(p => ({ ...p, [subId]: { ...p[subId], saving: false } }));
        }
    };

    /* ADD SUBCATEGORY (level 2) inline in detail view */
    const [addSubForm, setAddSubForm] = useState({ open: false, name: '', file: null, preview: null, saving: false });

    const saveNewSub = async () => {
        if (!addSubForm.name.trim()) return toast.error('Subcategory name is required');
        setAddSubForm(p => ({ ...p, saving: true }));
        try {
            const catId = activeCategory._id || activeCategory.id;
            const fd = new FormData();
            fd.append('name', addSubForm.name.trim());
            fd.append('level', 2);
            fd.append('parent', catId);
            if (addSubForm.file) fd.append('image', addSubForm.file);
            await api.post('/admin/b2b-categories', fd);
            toast.success('Subcategory added!');
            setAddSubForm({ open: false, name: '', file: null, preview: null, saving: false });
            await refreshActive(catId);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed');
        } finally {
            setAddSubForm(p => ({ ...p, saving: false }));
        }
    };

    /* ══════════════════════════════════════════
       DELETE HANDLERS
    ══════════════════════════════════════════ */
    const handleDeleteRoot = (cat, e) => {
        e && e.stopPropagation();
        setDeleteConfirm({ show: true, id: cat._id || cat.id, name: cat.name, input: '' });
    };

    const executeDeleteRoot = async () => {
        const { id, name, input } = deleteConfirm;
        if (input !== name) return toast.error(`Type "${name}" to confirm`);
        try {
            setLoading(true);
            await api.delete(`/admin/b2b-categories/${id}`);
            toast.success('Category deleted');
            setDeleteConfirm({ show: false, id: null, name: '', input: '' });
            if (view === 'detail' && (activeCategory._id === id || activeCategory.id === id)) {
                setView('list');
            }
            await loadCategories();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSub = (sub, e) => {
        e && e.stopPropagation();
        setSubDeleteConfirm({ show: true, id: sub._id || sub.id, name: sub.name, input: '', isSubSub: false });
    };

    const handleDeleteSubSub = (ss, e) => {
        e && e.stopPropagation();
        setSubDeleteConfirm({ show: true, id: ss._id || ss.id, name: ss.name, input: '', isSubSub: true });
    };

    const executeDeleteSub = async () => {
        const { id, name, input } = subDeleteConfirm;
        if (input !== name) return toast.error(`Type "${name}" to confirm`);
        try {
            setLoading(true);
            await api.delete(`/admin/b2b-categories/${id}`);
            toast.success('Deleted successfully');
            setSubDeleteConfirm({ show: false, id: null, name: '', input: '', isSubSub: false });
            await refreshActive(activeCategory._id || activeCategory.id);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setLoading(false);
        }
    };

    /* ══════════════════════════════════════════
       FILTERED LIST
    ══════════════════════════════════════════ */
    const filteredCats = categories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    /* ══════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════ */
    return (
        <div className="min-h-screen bg-gray-50/50">

            {/* ────────── LIST VIEW ────────── */}
            <AnimatePresence mode="wait">
                {view === 'list' && (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="p-6 space-y-6 max-w-4xl mx-auto"
                    >
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-black text-gray-900">Categories</h1>
                                <p className="text-sm text-gray-500 font-medium mt-0.5">Manage your product categories hierarchy</p>
                            </div>
                            <button
                                onClick={openAddRoot}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 text-sm"
                            >
                                <FiPlus strokeWidth={2.5} /> Add New Category
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full sm:w-80 px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm text-sm outline-none"
                            />
                        </div>

                        {/* List */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            {loading && categories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
                                    <p className="text-gray-500 font-medium text-sm">Loading categories…</p>
                                </div>
                            ) : filteredCats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center">
                                        <FiLayers className="text-2xl text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium text-sm">No categories found</p>
                                    <button
                                        onClick={openAddRoot}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 font-bold text-sm rounded-xl hover:bg-indigo-100 transition-colors"
                                    >
                                        + Add your first category
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {filteredCats.map((cat, idx) => {
                                        const subCount = (cat.subcategories || []).length;
                                        return (
                                            <motion.div
                                                key={cat.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.04 }}
                                                onClick={() => openDetail(cat)}
                                                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-indigo-50/40 transition-colors group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    {/* Image */}
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                                                        {cat.image ? (
                                                            <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <FiImage className="text-gray-400 text-lg" />
                                                        )}
                                                    </div>

                                                    {/* Name */}
                                                    <div>
                                                        <h3 className="font-bold text-gray-800 text-[15px] group-hover:text-indigo-700 transition-colors">
                                                            {cat.name}
                                                        </h3>
                                                        <span className="text-xs text-gray-400 font-medium">
                                                            {subCount} Subcategor{subCount === 1 ? 'y' : 'ies'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={(e) => openEditRoot(cat, e)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteRoot(cat, e)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 size={15} />
                                                    </button>
                                                    <FiChevronRight className="text-gray-300 group-hover:text-indigo-400 ml-1 transition-colors" size={16} />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ────────── DETAIL VIEW ────────── */}
                {view === 'detail' && activeCategory && (
                    <motion.div
                        key="detail"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.22 }}
                        className="p-6 space-y-5"
                    >
                        {/* Top bar */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setView('list')}
                                    className="flex items-center gap-1.5 text-gray-500 font-bold hover:text-gray-900 text-sm transition-colors"
                                >
                                    <FiArrowLeft strokeWidth={2.5} /> Back
                                </button>
                                <span className="text-gray-300">/</span>
                                <div className="flex items-center gap-3">
                                    {activeCategory.image && (
                                        <img src={activeCategory.image} alt={activeCategory.name} className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                                    )}
                                    <h1 className="text-xl font-black text-gray-900">{activeCategory.name}</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={e => openEditRoot(activeCategory, e)}
                                    className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <FiEdit2 size={14} /> Edit Category
                                </button>
                                <button
                                    onClick={() => setAddSubForm({ open: true, name: '', file: null, preview: null, saving: false })}
                                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-colors shadow-md shadow-indigo-200"
                                >
                                    <FiPlus strokeWidth={2.5} /> Add Subcategory
                                </button>
                            </div>
                        </div>

                        {/* Add subcategory inline form */}
                        <AnimatePresence>
                            {addSubForm.open && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-sm overflow-hidden"
                                >
                                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-3">New Subcategory</p>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                        <input
                                            type="text"
                                            value={addSubForm.name}
                                            onChange={e => setAddSubForm(p => ({ ...p, name: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && saveNewSub()}
                                            placeholder="Subcategory name…"
                                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
                                            autoFocus
                                        />

                                        {/* Image Upload for New Subcategory */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg border border-dashed border-gray-300 bg-gray-55 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {addSubForm.preview ? (
                                                    <img src={addSubForm.preview} alt="preview" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FiImage className="text-gray-400 text-sm" />
                                                )}
                                            </div>
                                            <label className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-55 cursor-pointer transition-colors">
                                                <FiImage size={13} />
                                                {addSubForm.file ? 'Change Image' : 'Upload Image'}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            setAddSubForm(p => ({ ...p, file, preview: URL.createObjectURL(file) }));
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={saveNewSub}
                                                disabled={addSubForm.saving}
                                                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                                            >
                                                {addSubForm.saving ? <FiLoader className="animate-spin" /> : <FiCheck />} Save
                                            </button>
                                            <button
                                                onClick={() => setAddSubForm({ open: false, name: '', file: null, preview: null, saving: false })}
                                                className="p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                                            >
                                                <FiX />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Columns */}
                        {(activeCategory.subcategories || []).length === 0 ? (
                            <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-24 text-center">
                                <FiTag className="text-4xl text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium text-sm">No subcategories yet.</p>
                                <button
                                    onClick={() => setAddSubForm({ open: true, name: '', file: null, preview: null, saving: false })}
                                    className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors"
                                >
                                    + Add first subcategory
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-5 overflow-x-auto pb-6 items-start" style={{ minHeight: '60vh' }}>
                                {(activeCategory.subcategories || []).map((sub) => {
                                    const subId = sub._id || sub.id;
                                    const subSubs = sub.subcategories || [];
                                    const addForm = colAddForms[subId] || {};
                                    const editForm = colEditForms[subId] || {};
                                    const subEdit = subEditForms[subId] || {};

                                    return (
                                        <motion.div
                                            key={subId}
                                            initial={{ opacity: 0, scale: 0.97 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.18 }}
                                            className="w-[280px] flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                                        >
                                            {/* Column Header */}
                                            <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gray-50/60">
                                                {subEdit.open ? (
                                                    /* Edit subcategory name & image */
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                value={subEdit.name}
                                                                onChange={e => setSubEditForms(p => ({ ...p, [subId]: { ...p[subId], name: e.target.value } }))}
                                                                onKeyDown={e => e.key === 'Enter' && saveSubEdit(subId)}
                                                                className="flex-1 min-w-0 px-3 py-1.5 border border-indigo-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-200 bg-white"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => saveSubEdit(subId)}
                                                                disabled={subEdit.saving}
                                                                className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0"
                                                            >
                                                                {subEdit.saving ? <FiLoader size={13} className="animate-spin" /> : <FiCheck size={13} />}
                                                            </button>
                                                            <button onClick={() => closeSubEdit(subId)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 flex-shrink-0">
                                                                <FiX size={13} />
                                                            </button>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded border border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                {subEdit.preview ? (
                                                                    <img src={subEdit.preview} alt="preview" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <FiImage className="text-gray-400 text-xs" />
                                                                )}
                                                            </div>
                                                            <label className="flex-1 flex items-center justify-center gap-1 px-2 py-1 border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer bg-white">
                                                                <FiImage size={11} />
                                                                {subEdit.file ? 'Changed' : (subEdit.existingImage ? 'Replace' : 'Upload')}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={e => {
                                                                        const file = e.target.files[0];
                                                                        if (file) {
                                                                            setSubEditForms(p => ({
                                                                                ...p,
                                                                                [subId]: { ...p[subId], file, preview: URL.createObjectURL(file) }
                                                                            }));
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center min-w-0 flex-1 pr-2">
                                                            {sub.image && (
                                                                <img src={sub.image} alt={sub.name} className="w-7 h-7 rounded object-cover border border-gray-200 mr-2 flex-shrink-0" />
                                                            )}
                                                            <h3 className="font-black text-gray-800 text-[15px] leading-tight truncate">{sub.name}</h3>
                                                        </div>
                                                        <div className="flex gap-1 flex-shrink-0">
                                                            <button
                                                                onClick={e => openSubEdit(sub, e)}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                title="Edit subcategory"
                                                            >
                                                                <FiEdit2 size={13} />
                                                            </button>
                                                            <button
                                                                onClick={e => handleDeleteSub(sub, e)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Delete subcategory"
                                                            >
                                                                <FiTrash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subcategories</span>
                                                    <button
                                                        onClick={() => addForm.open ? closeColAdd(subId) : openColAdd(subId)}
                                                        className="text-[11px] font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition-colors"
                                                    >
                                                        {addForm.open ? <FiX size={11} /> : <FiPlus size={11} />}
                                                        {addForm.open ? 'Cancel' : 'Add'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Add sub-sub form */}
                                            <AnimatePresence>
                                                {addForm.open && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="border-b border-indigo-100 bg-indigo-50/40 overflow-hidden"
                                                    >
                                                        <div className="p-4 space-y-3">
                                                            <input
                                                                type="text"
                                                                value={addForm.name || ''}
                                                                onChange={e => updateColAddForm(subId, { name: e.target.value })}
                                                                placeholder="Sub-subcategory Name…"
                                                                className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-white font-medium"
                                                                autoFocus
                                                            />

                                                            {/* Image Upload for New Sub-subcategory */}
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded border border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                    {addForm.preview ? (
                                                                        <img src={addForm.preview} alt="preview" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <FiImage className="text-gray-400 text-xs" />
                                                                    )}
                                                                </div>
                                                                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer bg-white transition-colors">
                                                                    <FiImage size={11} />
                                                                    {addForm.file ? 'Change Image' : 'Upload Image'}
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={e => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                updateColAddForm(subId, { file, preview: URL.createObjectURL(file) });
                                                                            }
                                                                        }}
                                                                        className="hidden"
                                                                    />
                                                                </label>
                                                            </div>

                                                            {/* Fields */}
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Subcategory Fields</span>
                                                                    <button
                                                                        onClick={() => addFieldToColForm(subId)}
                                                                        className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded-full flex items-center gap-0.5 transition-colors"
                                                                    >
                                                                        <FiPlus size={9} /> Field
                                                                    </button>
                                                                </div>

                                                                {(addForm.fields || []).map(field => (
                                                                    <div key={field.uiId} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-indigo-100 relative">
                                                                        <button
                                                                            onClick={() => removeColFormField(subId, field.uiId)}
                                                                            className="absolute right-2 top-2 text-red-400 hover:text-red-600 p-0.5"
                                                                        >
                                                                            <FiX size={11} />
                                                                        </button>
                                                                        <div className="flex-1 space-y-1.5 pr-4">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Label"
                                                                                value={field.label}
                                                                                onChange={e => updateColFormField(subId, field.uiId, 'label', e.target.value)}
                                                                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                                                                            />
                                                                            <select
                                                                                value={field.type}
                                                                                onChange={e => updateColFormField(subId, field.uiId, 'type', e.target.value)}
                                                                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                                                                            >
                                                                                {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                                                            </select>
                                                                            <label className="flex items-center gap-1.5 cursor-pointer mt-1 pl-1">
                                                                                <input 
                                                                                    type="checkbox"
                                                                                    checked={field.isVariant || false}
                                                                                    onChange={e => updateColFormField(subId, field.uiId, 'isVariant', e.target.checked)}
                                                                                    className="w-3.5 h-3.5 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                />
                                                                                <span className="text-[10px] text-gray-500 font-bold select-none cursor-pointer">Is Selectable Variant?</span>
                                                                            </label>
                                                                            {(field.type === 'select' || field.type === 'multi-select') && (
                                                                                <TagInput
                                                                                    options={field.options || []}
                                                                                    onChange={newOpts => updateColFormField(subId, field.uiId, 'options', newOpts)}
                                                                                    placeholder="e.g. Cotton, Silk, Polyester"
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            <button
                                                                onClick={() => saveSubSub(subId)}
                                                                disabled={addForm.saving}
                                                                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                                                            >
                                                                {addForm.saving ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                                                                Save Subcategory
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Sub-subcategory list */}
                                            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                                                {subSubs.length === 0 && !addForm.open && (
                                                    <p className="text-xs text-gray-400 font-medium text-center py-4">No sub-categories. Click + Add above.</p>
                                                )}

                                                {subSubs.map((ss) => {
                                                    const ssId = ss._id || ss.id;
                                                    const isEditing = editForm.open && editForm.subSubId === ssId;
                                                    const fields = ss.fields || [];

                                                    return (
                                                        <div key={ssId} className="rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden">
                                                            {/* Sub-sub header */}
                                                            <div className="flex items-start justify-between px-3 py-2.5 group">
                                                                <div className="flex items-center min-w-0 flex-1 pr-2">
                                                                    {ss.image && (
                                                                <img src={ss.image} alt={ss.name} className="w-7 h-7 rounded object-cover border border-gray-200 mr-2 flex-shrink-0" />
                                                                    )}
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-bold text-gray-800 text-sm leading-tight truncate">{ss.name}</h4>
                                                                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">{fields.length} field{fields.length !== 1 ? 's' : ''} defined</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => isEditing ? closeSubSubEdit(subId) : openSubSubEdit(subId, ss)}
                                                                        className="p-1 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50"
                                                                        title="Edit"
                                                                    >
                                                                        <FiEdit2 size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={e => handleDeleteSubSub(ss, e)}
                                                                        className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                                                                        title="Delete"
                                                                    >
                                                                        <FiTrash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Field chips */}
                                                            {fields.length > 0 && !isEditing && (
                                                                <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
                                                                    {fields.slice(0, 3).map((f, i) => (
                                                                        <span key={i} className="text-[9px] px-2 py-1 bg-white border border-gray-200 rounded text-gray-600 font-black uppercase tracking-wider shadow-sm">
                                                                            {f.label}
                                                                        </span>
                                                                    ))}
                                                                    {fields.length > 3 && (
                                                                        <span className="text-[10px] text-gray-400 font-bold px-1 py-0.5">+{fields.length - 3} more</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Inline edit form */}
                                                            <AnimatePresence>
                                                                {isEditing && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        className="border-t border-indigo-100 bg-indigo-50/30 overflow-hidden"
                                                                    >
                                                                        <div className="p-3 space-y-2.5">
                                                                            {/* Name + save/cancel row */}
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    value={editForm.name}
                                                                                    onChange={e => updateEditForm(subId, { name: e.target.value })}
                                                                                    className="flex-1 min-w-0 px-3 py-2 border border-indigo-200 rounded-xl text-sm font-bold bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                                                                    autoFocus
                                                                                />
                                                                                <button
                                                                                    onClick={() => saveSubSubEdit(subId)}
                                                                                    disabled={editForm.saving}
                                                                                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                                                >
                                                                                    {editForm.saving ? <FiLoader size={13} className="animate-spin" /> : <FiCheck size={13} />}
                                                                                </button>
                                                                                <button onClick={() => closeSubSubEdit(subId)} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                                                                                    <FiX size={13} />
                                                                                </button>
                                                                            </div>

                                                                            {/* Image Upload for Edit Sub-subcategory */}
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-8 h-8 rounded border border-dashed border-gray-300 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                                                                                    {editForm.preview ? (
                                                                                        <img src={editForm.preview} alt="preview" className="w-full h-full object-cover" />
                                                                                    ) : (
                                                                                        <FiImage className="text-gray-400 text-xs" />
                                                                                    )}
                                                                                </div>
                                                                                <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer bg-white transition-colors">
                                                                                    <FiImage size={11} />
                                                                                    {editForm.file ? 'Changed' : (editForm.existingImage ? 'Replace' : 'Upload')}
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        onChange={e => {
                                                                                            const file = e.target.files[0];
                                                                                            if (file) {
                                                                                                updateEditForm(subId, { file, preview: URL.createObjectURL(file) });
                                                                                            }
                                                                                        }}
                                                                                        className="hidden"
                                                                                    />
                                                                                </label>
                                                                            </div>

                                                                            {/* Edit fields */}
                                                                            <div>
                                                                                <div className="flex items-center justify-between mb-1.5">
                                                                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Edit Fields</span>
                                                                                    <button
                                                                                        onClick={() => addFieldToEditForm(subId)}
                                                                                        className="text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-0.5"
                                                                                    >
                                                                                        <FiPlus size={9} /> Field
                                                                                    </button>
                                                                                </div>

                                                                                <div className="space-y-1.5">
                                                                                    {(editForm.fields || []).map(field => (
                                                                                        <div key={field.uiId} className="bg-white rounded-xl border border-indigo-100 p-2.5 relative">
                                                                                            <button
                                                                                                onClick={() => removeEditFormField(subId, field.uiId)}
                                                                                                className="absolute right-2 top-2 text-red-400 hover:text-red-600"
                                                                                            >
                                                                                                <FiX size={10} />
                                                                                            </button>
                                                                                            <div className="space-y-1.5 pr-4">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    placeholder="Label"
                                                                                                    value={field.label}
                                                                                                    onChange={e => updateEditFormField(subId, field.uiId, 'label', e.target.value)}
                                                                                                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                                                                                                />
                                                                                                <div className="flex gap-1.5 items-center">
                                                                                                    <select
                                                                                                        value={field.type}
                                                                                                        onChange={e => updateEditFormField(subId, field.uiId, 'type', e.target.value)}
                                                                                                        className="flex-1 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                                                                                                    >
                                                                                                        {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                                                                                    </select>
                                                                                                    <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                                                                                                        <input 
                                                                                                            type="checkbox"
                                                                                                            checked={field.isVariant || false}
                                                                                                            onChange={e => updateEditFormField(subId, field.uiId, 'isVariant', e.target.checked)}
                                                                                                            className="w-3.5 h-3.5 border-gray-300 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                                                        />
                                                                                                        <span className="text-[10px] text-gray-500 font-bold select-none cursor-pointer">Variant?</span>
                                                                                                    </label>
                                                                                                </div>
                                                                                                {(field.type === 'select' || field.type === 'multi-select') && (
                                                                                                    <TagInput
                                                                                                        options={field.options || []}
                                                                                                        onChange={newOpts => updateEditFormField(subId, field.uiId, 'options', newOpts)}
                                                                                                        placeholder="e.g. Cotton, Silk, Polyester"
                                                                                                    />
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                    {(editForm.fields || []).length === 0 && (
                                                                                        <p className="text-[10px] text-gray-400 text-center py-1">No fields yet. Click + Field to add.</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ══════════════════════════════
                ROOT CATEGORY MODAL (Add/Edit)
            ══════════════════════════════ */}
            {rootModal.open && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={e => e.target === e.currentTarget && closeRootModal()}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 20 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            {/* Modal header */}
                            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                                <h2 className="text-lg font-black text-gray-900">
                                    {rootModal.id ? 'Edit Category' : 'New Category'}
                                </h2>
                                <button onClick={closeRootModal} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                                    <FiX />
                                </button>
                            </div>

                            {/* Modal body */}
                            <div className="px-6 py-5 space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Category Name</label>
                                    <input
                                        type="text"
                                        value={rootModal.name}
                                        onChange={e => setRootModal(p => ({ ...p, name: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && saveRoot()}
                                        placeholder="e.g. Men's Fashion"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                                        autoFocus
                                    />
                                </div>

                                {/* Image */}
                                <div>
                                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Category Image</label>
                                    <div className="flex items-center gap-4">
                                        {/* Preview */}
                                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {rootModal.preview ? (
                                                <img src={rootModal.preview} alt="preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <FiImage className="text-gray-300 text-xl" />
                                            )}
                                        </div>

                                        <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <FiImage size={15} />
                                            {rootModal.file ? 'Change Image' : (rootModal.existingImage ? 'Replace Image' : 'Upload Image')}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleRootFile}
                                                className="hidden"
                                                ref={rootImgRef}
                                            />
                                        </label>
                                    </div>
                                    {rootModal.file && (
                                        <p className="text-xs text-gray-400 mt-1.5 truncate">{rootModal.file.name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Modal footer */}
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={closeRootModal}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveRoot}
                                    disabled={rootModal.saving}
                                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors text-sm shadow-lg shadow-indigo-200"
                                >
                                    {rootModal.saving ? <FiLoader className="animate-spin" size={15} /> : <FiSave size={15} />}
                                    {rootModal.id ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* ══════════════════════════════
                DELETE ROOT CONFIRM
            ══════════════════════════════ */}
            {deleteConfirm.show && createPortal(
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
                                <FiTrash2 className="text-2xl text-red-500" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 mb-2">Delete Category</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                You are about to delete <strong>"{deleteConfirm.name}"</strong> and all its subcategories. This action cannot be undone.
                            </p>
                            <div className="w-full text-left mb-5">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Type the category name to confirm</label>
                                <input
                                    type="text"
                                    value={deleteConfirm.input}
                                    onChange={e => setDeleteConfirm(p => ({ ...p, input: e.target.value }))}
                                    placeholder={deleteConfirm.name}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                />
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteConfirm({ show: false, id: null, name: '', input: '' })} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={executeDeleteRoot}
                                    disabled={deleteConfirm.input !== deleteConfirm.name || loading}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors ${deleteConfirm.input === deleteConfirm.name ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}`}
                                >
                                    {loading ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>,
                document.body
            )}

            {/* ══════════════════════════════
                DELETE SUB / SUB-SUB CONFIRM
            ══════════════════════════════ */}
            {subDeleteConfirm.show && createPortal(
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-5">
                                <FiTrash2 className="text-2xl text-red-500" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 mb-2">
                                Delete {subDeleteConfirm.isSubSub ? 'Sub-subcategory' : 'Subcategory'}
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Delete <strong>"{subDeleteConfirm.name}"</strong>? This cannot be undone.
                            </p>
                            <div className="w-full text-left mb-5">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Type the name to confirm</label>
                                <input
                                    type="text"
                                    value={subDeleteConfirm.input}
                                    onChange={e => setSubDeleteConfirm(p => ({ ...p, input: e.target.value }))}
                                    placeholder={subDeleteConfirm.name}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                />
                            </div>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setSubDeleteConfirm({ show: false, id: null, name: '', input: '', isSubSub: false })} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={executeDeleteSub}
                                    disabled={subDeleteConfirm.input !== subDeleteConfirm.name || loading}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors ${subDeleteConfirm.input === subDeleteConfirm.name ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-300 cursor-not-allowed'}`}
                                >
                                    {loading ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>,
                document.body
            )}
        </div>
    );
};

export default B2BCategories;
