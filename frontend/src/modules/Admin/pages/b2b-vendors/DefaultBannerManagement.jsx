import { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiImage, FiLink, FiInfo } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { getDefaultBanners, createDefaultBanner, deleteDefaultBanner } from "../../services/defaultBannerService";

const DefaultBannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        image: null
    });
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        loadBanners();
    }, []);

    const loadBanners = async () => {
        setLoading(true);
        try {
            const response = await getDefaultBanners();
            if (response.success) {
                setBanners(response.data);
            }
        } catch (error) {
            console.error("Failed to load banners:", error);
            toast.error("Failed to load banners");
        } finally {
            setLoading(false);
        }
    };



    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Image size should be less than 5MB.");
                return;
            }

            setLoading(true);
            try {
                setFormData({ ...formData, image: file });
                setPreviewUrl(URL.createObjectURL(file));
            } catch (err) {
                console.error("Failed to process image:", err);
                toast.error("Failed to process image");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.image) {
            toast.error("Please select an image");
            return;
        }

        const data = new FormData();
        data.append("title", formData.title);
        data.append("image", formData.image);

        setLoading(true);
        try {
            const response = await createDefaultBanner(data);
            if (response.success) {
                toast.success("Banner added successfully");
                setFormData({ title: "", image: null });
                setPreviewUrl(null);
                setShowAddModal(false);
                loadBanners();
            }
        } catch (error) {
            console.error("Failed to add banner:", error);
            toast.error(error?.response?.data?.message || "Failed to add banner");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this banner?")) return;

        try {
            const response = await deleteDefaultBanner(id);
            if (response.success) {
                toast.success("Banner deleted");
                loadBanners();
            }
        } catch (error) {
            console.error("Failed to delete banner:", error);
            toast.error("Failed to delete banner");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-8">
                <div className="flex-1">
                    <h1 className="lg:hidden text-2xl font-bold text-gray-900">Default Admin Banners</h1>
                    <p className="text-gray-500 text-sm font-medium">Manage default fallback banners for the platform</p>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-primary-200"
                >
                    <FiPlus /> Add Default Banner
                </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex items-start gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <FiInfo className="text-xl" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900">Banner Priority System</h4>
                    <p className="text-sm text-blue-700">
                        The B2B landing page automatically checks for active vendor-purchased banners first. If any exist, only those are shown.
                        If no vendor banners are active, these default banners will be displayed as a fallback.
                    </p>
                </div>
            </div>

            {loading && banners.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-2xl h-48 animate-pulse shadow-sm border border-gray-100"></div>
                    ))}
                </div>
            ) : banners.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiImage className="text-3xl text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No Default Banners</h3>
                    <p className="text-gray-500 mb-6">You haven't added any default banners yet.</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="text-primary-600 font-bold hover:underline"
                    >
                        Create your first default banner
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.map((banner) => (
                        <motion.div
                            layout
                            key={banner._id}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300"
                        >
                            <div className="relative aspect-[8/3] bg-gray-100">
                                <img
                                    src={banner.image}
                                    alt={banner.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => handleDelete(banner._id)}
                                        className="p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                        title="Delete Banner"
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 mb-1">{banner.title || "Untiled Banner"}</h3>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
                        >
                            <h2 className="text-2xl font-black text-gray-900 mb-6">Add Default Banner</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Banner Title</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                        placeholder="e.g. Seasonal Clearance"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Banner Image (16:6 or 8:3 recommended)</label>
                                    <div
                                        onClick={() => document.getElementById('banner-file').click()}
                                        className={`relative w-full aspect-[8/3] rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden ${previewUrl ? 'border-primary-500' : 'border-gray-200 hover:border-primary-400 bg-gray-50'
                                            }`}
                                    >
                                        {previewUrl ? (
                                            <>
                                                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                    <span className="text-white font-bold bg-black/40 px-3 py-1 rounded-full text-xs">Change Image</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <FiImage className="text-3xl text-gray-300" />
                                                <span className="text-sm font-medium text-gray-500">Click to upload banner</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        id="banner-file"
                                        type="file"
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] px-4 py-3 rounded-xl font-bold bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50"
                                    >
                                        {loading ? "Uploading..." : "Save Banner"}
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

export default DefaultBannerManagement;
