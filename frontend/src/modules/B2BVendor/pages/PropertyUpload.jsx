import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiPlus, FiTrash2, FiMapPin, FiMaximize, FiHome, FiImage, FiCamera } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import B2BHeader from '../../B2BUserApp/components/Layout/B2BHeader';
import toast from 'react-hot-toast';

const PropertyUpload = () => {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        location: '',
        area: '',
        type: 'Residential',
        description: ''
    });

    const cameraInputRef = React.useRef(null);

    const handleImageUpload = (e, isCamera = false) => {
        const files = Array.from(e.target.files);
        console.log(`[PropertyImage] ${isCamera ? 'Camera' : 'File'} input triggered. Files:`, files.length);

        const toastId = toast.loading(isCamera ? 'Reading photo...' : 'Reading images...');

        let processedCount = 0;
        files.forEach(file => {
            console.log(`[PropertyImage] Reading: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImages(prev => [...prev, reader.result]);
                processedCount++;
                if (processedCount === files.length) {
                    toast.success(isCamera ? 'Photo added' : 'Images added', { id: toastId });
                    // Clear input to allow re-selection
                    e.target.value = '';
                }
            };
            reader.onerror = (err) => {
                console.error('[PropertyImage] FileReader error:', err);
                toast.error('Failed to read image', { id: toastId });
                e.target.value = '';
            };
            reader.readAsDataURL(file);
        });
        
        if (files.length === 0) {
            toast.dismiss(toastId);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Property Upload Data:', { ...formData, images });
        toast.success('Property details logged to console!');
        // In a real app, this would be an API call
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
            <B2BHeader title="Upload Commercial" />

            <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-gray-100 rounded-full shadow-sm transition-all text-gray-700">
                        <FiArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">List Your Commercial</h1>
                        <p className="text-gray-500 font-medium">Quick & easy property listing for verified partners</p>
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-gray-100">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Image Upload Section */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] mb-4">Commercial Gallery (Max 10 Photos)</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-100">
                                        <img src={img} alt="Property" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                                        >
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {images.length < 10 && (
                                    <div className="grid grid-cols-2 col-span-2 sm:col-span-1 gap-3">
                                        <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all text-gray-400 group">
                                            <input 
                                                type="file" 
                                                multiple 
                                                accept="image/*" 
                                                onChange={(e) => handleImageUpload(e, false)} 
                                                className="hidden" 
                                            />
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all shadow-sm">
                                                <FiPlus size={20} />
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-center">Upload</span>
                                        </label>
                                        <button 
                                            type="button"
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-all text-gray-400 group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-sm">
                                                <FiCamera size={18} />
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-center">Camera</span>
                                            <input 
                                                ref={cameraInputRef}
                                                type="file" 
                                                capture="environment" 
                                                accept="image/*" 
                                                onChange={(e) => handleImageUpload(e, true)} 
                                                style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                                            />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title & Type */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] ml-2">Commercial Title</label>
                                <div className="relative">
                                    <FiHome className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-600" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Luxury 4BHK Penthouse"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent border-2 focus:border-primary-100 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] ml-2">Property Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 border-transparent border-2 focus:border-primary-100 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                                >
                                    <option>Residential</option>
                                    <option>Commercial</option>
                                    <option>Industrial</option>
                                    <option>Agricultural</option>
                                    <option>Land / Plot</option>
                                </select>
                            </div>
                        </div>

                        {/* Price & Area */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] ml-2">Expected Price (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-primary-600">₹</span>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 1.25 Cr"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent border-2 focus:border-primary-100 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] ml-2">Total Area (sq.ft)</label>
                                <div className="relative">
                                    <FiMaximize className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-600" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 2400 sq.ft"
                                        value={formData.area}
                                        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                        className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent border-2 focus:border-primary-100 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] ml-2">Location Details</label>
                            <div className="relative">
                                <FiMapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-primary-600" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. MG Road, Indore, MP"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent border-2 focus:border-primary-100 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] ml-2">Description</label>
                            <textarea
                                rows="4"
                                placeholder="Describe the property, amenities, and nearby landmarks..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 border-transparent border-2 focus:border-primary-100 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-700 resize-none"
                            ></textarea>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-6">
                            <button
                                type="submit"
                                className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3"
                            >
                                Submit Listing for Review
                            </button>
                            <p className="text-center mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Note: This is a frontend demo and will not save to database yet.</p>
                        </div>
                    </form>
                </div>
            </main>

        </div>
    );
};

export default PropertyUpload;
