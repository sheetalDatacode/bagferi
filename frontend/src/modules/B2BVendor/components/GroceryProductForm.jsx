import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSave, FiX, FiUpload, FiTrash2, FiImage, FiTag, FiDollarSign, FiList } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import { useB2BVendorAuthStore } from "../store/b2bVendorAuthStore";

const GroceryProductForm = ({ initialData, isEdit, productId }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { vendor } = useB2BVendorAuthStore();
    
    const [formData, setFormData] = useState(initialData || {
        title: "",
        description: "",
        price: "",
        stock: "",
        category: "",
        subcategory: "",
        subsubcategory: "",
        unit: "kg",
        weight: "",
        brand: "",
        tags: "",
        status: "Active"
    });

    const [categories, setCategories] = useState([]);
    const [subcategories, setSubcategories] = useState([]);
    const [subSubcategories, setSubSubcategories] = useState([]);
    const [images, setImages] = useState([]); // UI state for new images
    const [existingImages, setExistingImages] = useState(initialData?.media || []); // Already uploaded

    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (formData.category && categories.length > 0) {
            const cat = categories.find(c => c.name === formData.category || c._id === formData.category);
            setSubcategories(cat?.subcategories || []);
        } else {
            setSubcategories([]);
        }
    }, [formData.category, categories]);

    useEffect(() => {
        if (formData.subcategory && subcategories.length > 0) {
            const subcat = subcategories.find(s => s.name === formData.subcategory || s._id === formData.subcategory);
            setSubSubcategories(subcat?.subcategories || []);
        } else {
            setSubSubcategories([]);
        }
    }, [formData.subcategory, subcategories]);

    const fetchCategories = async () => {
        try {
            const res = await api.get('/grocery/categories');
            if (res.success) setCategories(res.data || []);
        } catch (error) {
            console.error("Error fetching categories", error);
        }
    };

    const handleImageChange = (e) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setImages(prev => [...prev, ...files]);
        }
    };

    const removeNewImage = (idx) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
    };

    const removeExistingImage = (idx) => {
        setExistingImages(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });

            // Append new images
            // Append first image as 'image' for backend single upload
            if (images.length > 0) {
                data.append('image', images[0]);
            }
            // Map frontend fields to backend expected fields
            data.append('name', formData.title);
            data.append('stockQuantity', formData.stock);

            // If editing, handle existing images (may require backend support for keeping them or we skip this complexity for now)
            
            let res;
            if (isEdit) {
                res = await api.put(`/grocery/vendor/products/${productId}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                res = await api.post('/grocery/vendor/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            if (res.success) {
                toast.success(`Product ${isEdit ? 'updated' : 'added'} successfully`);
                navigate('/b2b-vendor/grocery-products');
            } else {
                toast.error(res.message || 'Failed to save product');
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while saving');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
            <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <FiList className="text-primary-600" /> Basic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Product Title *</label>
                        <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="e.g. Organic Tomatoes" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Brand</label>
                        <input type="text" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="e.g. FreshFarms" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-gray-700 uppercase">Description *</label>
                        <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="Describe the product..." />
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <FiDollarSign className="text-primary-600" /> Pricing & Inventory
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Price (₹) *</label>
                        <input required type="number" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="0.00" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Stock Quantity *</label>
                        <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="100" />
                    </div>
                    <div className="space-y-1 flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">Weight / Size</label>
                            <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" placeholder="1" />
                        </div>
                        <div className="w-24 space-y-1">
                            <label className="text-xs font-bold text-gray-700 uppercase">Unit</label>
                            <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="L">L</option>
                                <option value="ml">ml</option>
                                <option value="pcs">pcs</option>
                                <option value="dozen">dozen</option>
                                <option value="box">box</option>
                                <option value="pack">pack</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <FiTag className="text-primary-600" /> Categorization
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Category *</label>
                        <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value, subcategory: '', subsubcategory: ''})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c._id || c.name} value={c._id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Subcategory</label>
                        <select value={formData.subcategory} onChange={e => setFormData({...formData, subcategory: e.target.value, subsubcategory: ''})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                            <option value="">Select Subcategory</option>
                            {subcategories.map((s, i) => <option key={i} value={s._id}>{s.name || s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 uppercase">Sub-Subcategory</label>
                        <select value={formData.subsubcategory} onChange={e => setFormData({...formData, subsubcategory: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                            <option value="">Select Sub-Subcategory</option>
                            {subSubcategories.map((s, i) => <option key={i} value={s._id}>{s.name || s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <FiImage className="text-primary-600" /> Media
                </h2>
                <div className="mt-4">
                    <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                        <FiUpload /> Upload Images
                    </button>
                    
                    <div className="flex flex-wrap gap-4 mt-4">
                        {existingImages.map((img, idx) => (
                            <div key={`exist-${idx}`} className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group">
                                <img src={img.url || img} className="w-full h-full object-cover" alt="Existing" />
                                <button type="button" onClick={() => removeExistingImage(idx)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        ))}
                        {images.map((img, idx) => (
                            <div key={`new-${idx}`} className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group">
                                <img src={URL.createObjectURL(img)} className="w-full h-full object-cover" alt="New" />
                                <button type="button" onClick={() => removeNewImage(idx)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                <button type="button" onClick={() => navigate('/b2b-vendor/grocery-products')} className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-70">
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><FiSave /> Save Product</>}
                </button>
            </div>
        </form>
    );
};

export default GroceryProductForm;
