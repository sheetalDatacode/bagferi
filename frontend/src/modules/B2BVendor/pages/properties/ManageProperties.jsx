import { useState, useEffect, useMemo } from "react";
import { FiEdit2, FiTrash2, FiEye, FiSearch, FiMapPin, FiTag, FiTrendingUp, FiPlus, FiX, FiLayers, FiMaximize2, FiNavigation, FiCheckCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import SubscriptionGate from "../../components/SubscriptionGate";
import RatingSummaryBadge from "../../../../shared/components/RatingSummaryBadge";

const ManageProperties = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            setLoading(true);
            const response = await api.get('/property/list');
            if (response.success) {
                setProperties(response.data);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
            toast.error('Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this listing?')) return;
        try {
            const response = await api.delete(`/property/delete/${id}`);
            if (response.success) {
                toast.success('Listing removed');
                fetchProperties();
            }
        } catch (error) {
            toast.error('Failed to delete property');
        }
    };

    const getPropertyBucket = (property) => {
        const type = String(property?.propertyType || '').toLowerCase();

        // Priority 1: Explicit types
        if (type === 'flat') return 'flat';
        if (type === 'plot') return 'plot';
        if (type === 'villa' || type === 'row house') return 'villa';

        // Priority 2: Commercial types
        const commercialTypes = ['shop', 'office', 'showroom', 'godown', 'factory', 'commercial building', 'industrial shed', 'warehouse'];
        if (commercialTypes.includes(type) || type === 'commercial' || type === 'property') return 'commercial';

        // Priority 3: Check details for non-default markers if type is missing
        if (property?.plotDetails?.plotArea > 0) return 'villa';
        if (property?.flatDetails?.carpetArea > 0) return 'flat';

        return 'commercial';
    };

    const filteredProperties = useMemo(() => {
        return properties.filter((p) => {
            const title = String(p?.title || '').toLowerCase();
            const area = String(p?.location?.area || '').toLowerCase();
            const search = searchQuery.toLowerCase();
            const searchMatch = title.includes(search) || area.includes(search);
            if (!searchMatch) return false;

            if (propertyTypeFilter === 'all') return true;
            return getPropertyBucket(p) === propertyTypeFilter;
        });
    }, [properties, searchQuery, propertyTypeFilter]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-2 md:p-6 overflow-x-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="text-center lg:text-left">
                    <h1 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tight">Manage Listings</h1>
                    <p className="text-gray-500 text-sm font-medium">You have {properties.length} properties listed.</p>
                </div>
                <div className="flex flex-col md:flex-row flex-wrap xl:flex-nowrap gap-3 items-center w-full lg:w-auto">
                    <div className="relative w-full md:flex-1 xl:w-80">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or area..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-slate-800 outline-none transition-all font-medium text-sm"
                        />
                    </div>
                    <div className="flex w-full md:w-auto gap-3 items-center">
                        <select
                            value={propertyTypeFilter}
                            onChange={(e) => setPropertyTypeFilter(e.target.value)}
                            className="flex-1 md:w-auto px-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none font-bold text-sm text-slate-700 min-w-[120px]"
                        >
                            <option value="all">All Types</option>
                            <option value="flat">Flat</option>
                            <option value="villa">Villa</option>
                            <option value="plot">Plot</option>
                            <option value="commercial">Commercial</option>
                        </select>
                        <SubscriptionGate action="property">
                            <button
                                onClick={() => navigate("/b2b-vendor/properties/add-property")}
                                className="flex-1 md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg whitespace-nowrap"
                            >
                                <FiPlus className="text-lg" /> <span className="hidden sm:inline">New Listing</span><span className="sm:hidden">New</span>
                            </button>
                        </SubscriptionGate>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-96 bg-gray-100 animate-pulse rounded-[2.5rem]" />)}
                </div>
            ) : filteredProperties.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100 italic">
                    <FiTag size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-xl font-bold text-slate-400">No listings found</h3>
                    <p className="text-sm text-gray-400">Try adjusting your filters or add a new property.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProperties.map((property) => (
                        <motion.div
                            key={property._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
                        >
                            {/* Top: Image Section */}
                            <div className="relative h-60 overflow-hidden bg-gray-100 flex items-center justify-center">
                                {((property.images && property.images.length > 0) || property.media?.length > 0) ? (
                                    <img
                                        src={property.images?.length > 0 ? property.images[0] : property.media[0].url}
                                        alt={property.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                                        <FiMapPin size={32} className="mb-2 opacity-50" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Image Not Provided</span>
                                    </div>
                                )}

                                {/* Image Count Badge */}
                                <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase rounded-full flex items-center gap-1.5">
                                    <FiMaximize2 size={10} />
                                    {(property.images?.length || property.media?.length || 0)} Photos
                                </div>

                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black uppercase rounded-lg shadow-sm border border-gray-100">
                                        {property.propertyType}
                                    </span>
                                    <span className="px-3 py-1 bg-primary-600 text-white text-[10px] font-black uppercase rounded-lg shadow-sm">
                                        {property.listingType}
                                    </span>
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => setSelectedProperty(property)}
                                        className="bg-white text-slate-900 px-6 py-2 rounded-full font-black text-xs uppercase transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-xl"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Middle: Core Info */}
                                <div className="mb-4">
                                    <h3 className="text-lg font-black text-slate-800 mb-1 truncate leading-tight">{property.title}</h3>
                                    <div className="mb-2">
                                        <RatingSummaryBadge targetType="property" targetId={property._id} />
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                                        <FiMapPin size={12} className="text-red-500" />
                                        <span className="truncate">{property.location.area}, {property.location.city}</span>
                                    </div>
                                </div>

                                {/* Specs Row - show fields relevant to property type (commercial / flat / villa) */}
                                {(() => {
                                    const bucket = getPropertyBucket(property);
                                    const spec0 = Array.isArray(property.specifications) && property.specifications[0] ? property.specifications[0] : property.specifications;
                                    if (bucket === 'commercial') {
                                        const area = spec0?.builtUpArea || spec0?.carpetArea || property.totalArea;
                                        const areaUnit = spec0?.builtUpAreaUnit || spec0?.carpetAreaUnit || 'Sq. Ft.';
                                        const floorTotal = (spec0?.floorNumber && spec0?.totalFloors) ? `${spec0.floorNumber}/${spec0.totalFloors}` : (spec0?.floorNumber || spec0?.totalFloors || '—');
                                        const typeLabel = (property.propertyTypes && property.propertyTypes.length > 0) ? property.propertyTypes[0] : (property.propertyType || '—');
                                        return (
                                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl mb-4">
                                                <div className="text-center">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Area</p>
                                                    <p className="text-[10px] font-black text-slate-700 truncate">{area ? `${area} ${areaUnit}` : 'N/A'}</p>
                                                </div>
                                                <div className="text-center border-x border-slate-200">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Floor/Total</p>
                                                    <p className="text-[10px] font-black text-slate-700 truncate">{floorTotal}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Type</p>
                                                    <p className="text-[10px] font-black text-slate-700 truncate">{typeLabel}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (bucket === 'flat') {
                                        return (
                                            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl mb-4">
                                                <div className="text-center">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Area</p>
                                                    <p className="text-[10px] font-black text-slate-700 truncate">{property.flatDetails?.carpetArea ? `${property.flatDetails.carpetArea} ${property.flatDetails.carpetAreaUnit || 'Sq. Ft.'}` : 'N/A'}</p>
                                                </div>
                                                <div className="text-center border-x border-slate-200">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Floor/Total</p>
                                                    <p className="text-[10px] font-black text-slate-700 truncate">{property.flatDetails?.floorNumber && property.flatDetails?.totalFloors ? `${property.flatDetails.floorNumber}/${property.flatDetails.totalFloors}` : '—'}</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Type</p>
                                                    <p className="text-[10px] font-black text-slate-700 truncate">{property.flatDetails?.flatType || '—'}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    // villa / plot
                                    return (
                                        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl mb-4">
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Area</p>
                                                <p className="text-[10px] font-black text-slate-700 truncate">{property.plotDetails?.plotArea ? `${property.plotDetails.plotArea} sqft` : 'N/A'}</p>
                                            </div>
                                            <div className="text-center border-x border-slate-200">
                                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">
                                                    {property.propertyType === 'Plot' ? '-' : 'Floor/Total'}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-700 truncate">
                                                    {property.propertyType === 'Plot' ? '-' : (property.plotDetails?.floors || '—')}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Type</p>
                                                <p className="text-[10px] font-black text-slate-700 truncate">{property.propertyType === 'Plot' ? 'Plot' : 'Row house / Villa'}</p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Bottom: Price and Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                            {property.listingType === 'Sale' ? 'Price' : 'Monthly Rent'}
                                        </p>
                                        <p className="text-lg font-black text-slate-900 leading-none">
                                            {(() => {
                                                if (property.listingType === 'Sale') {
                                                    const min = property.saleDetails?.priceMin || 0;
                                                    const max = property.saleDetails?.priceMax || 0;
                                                    const unit = property.saleDetails?.priceUnit || '';
                                                    if (max && max !== min && Number(max) > 0) return `₹${Number(min).toLocaleString('en-IN')} - ${Number(max).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                                                    return `₹${Number(min).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                                                }
                                                if (property.listingType === 'Rent') {
                                                    const unit = property.rentDetails?.rentUnit || '';
                                                    return `₹${Number(property.rentDetails?.monthlyRent || 0).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`.replace(' /mo', '/mo');
                                                }
                                                if (property.listingType === 'Lease') {
                                                    const unit = property.leaseDetails?.leaseUnit || '';
                                                    return `₹${Number(property.leaseDetails?.monthlyLeaseRate || 0).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`.replace(' /mo', '/mo');
                                                }
                                                const unit = property.price?.unit || property.price?.priceUnit || '';
                                                return `₹${Number(property.price?.amount || 0).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                                            })()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/b2b-vendor/properties/edit/${property._id}`)}
                                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                            title="Edit"
                                        >
                                            <FiEdit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(property._id)}
                                            className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                            title="Delete"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* DETAIL VIEW MODAL */}
            <AnimatePresence>
                {selectedProperty && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8"
                        onClick={() => setSelectedProperty(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Left Side: Image Gallery */}
                            <div className="w-full md:w-3/5 bg-slate-900 relative group flex flex-col h-[40vh] md:h-auto border-r border-slate-100">
                                <button
                                    onClick={() => setSelectedProperty(null)}
                                    className="absolute top-6 left-6 z-10 p-3 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md md:hidden"
                                >
                                    <FiX size={20} />
                                </button>

                                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-slate-800">
                                    <AnimatePresence mode="wait">
                                        {(() => {
                                            const imgs = selectedProperty.images?.length > 0 ? selectedProperty.images : (selectedProperty.media?.map(m => m.url) || []);
                                            if (imgs.length > 0) {
                                                return (
                                                    <motion.img
                                                        key={activeImageIndex}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        src={imgs[activeImageIndex]}
                                                        className="w-full h-full object-cover"
                                                    />
                                                );
                                            } else {
                                                return (
                                                    <motion.div
                                                        key="no-image"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="w-full h-full flex flex-col items-center justify-center text-gray-500"
                                                    >
                                                        <FiMapPin size={48} className="mb-4 opacity-30" />
                                                        <span className="text-xs font-black uppercase tracking-widest opacity-30">Image Not Provided</span>
                                                    </motion.div>
                                                );
                                            }
                                        })()}
                                    </AnimatePresence>
                                </div>

                                {/* Thumbnails */}
                                {(() => {
                                    const imgs = selectedProperty.images?.length > 0 ? selectedProperty.images : (selectedProperty.media?.map(m => m.url) || []);
                                    if (imgs.length <= 1) return null;
                                    return (
                                        <div className="p-6 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 flex gap-3 overflow-x-auto scroll-hide">
                                            {imgs.map((img, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setActiveImageIndex(idx)}
                                                    className={`relative w-20 h-20 rounded-[1.25rem] overflow-hidden flex-shrink-0 border-2 transition-all duration-300 ${activeImageIndex === idx ? 'border-primary-500 scale-110 shadow-xl z-10' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                                                >
                                                    <img src={img} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Right Side: Content */}
                            <div className="w-full md:w-2/5 flex flex-col h-[60vh] md:h-auto bg-white">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-start sticky top-0 bg-white z-10">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className="px-3 py-1 bg-primary-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-primary-100">
                                                {selectedProperty.listingType}
                                            </span>
                                            {(() => {
                                                const types = selectedProperty.propertyTypes && selectedProperty.propertyTypes.length > 0
                                                    ? selectedProperty.propertyTypes
                                                    : [selectedProperty.propertyType];
                                                return types.map((type, idx) => (
                                                    <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-800 text-[10px] font-black uppercase rounded-lg">
                                                        {type}
                                                    </span>
                                                ));
                                            })()}
                                            {(selectedProperty.status?.propertyPosition || selectedProperty.status?.propertyStatus) && (
                                                <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black uppercase rounded-lg">
                                                    {selectedProperty.status.propertyPosition || selectedProperty.status.propertyStatus}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2 truncate">{selectedProperty.title}</h2>
                                        <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-wider">
                                            <FiMapPin className="text-red-500" />
                                            {selectedProperty.location.address ? `${selectedProperty.location.address}, ` : ''}
                                            {selectedProperty.location.area}, {selectedProperty.location.city}
                                            {(selectedProperty.location.state || selectedProperty.location.market) && <span className="text-slate-300">• {selectedProperty.location.state || selectedProperty.location.market}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedProperty(null)}
                                        className="hidden md:block p-3 hover:bg-slate-50 text-slate-300 hover:text-slate-900 rounded-2xl transition-all"
                                    >
                                        <FiX size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-10 scroll-hide">
                                    {/* Pricing Card */}
                                    <div className="relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem]" />
                                        <div className="relative p-8 flex items-center justify-between text-white">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">Listing Price</p>
                                                <p className="text-4xl font-black tracking-tight">
                                                    {(() => {
                                                        const p = selectedProperty;
                                                        if (p.listingType === 'Sale') {
                                                            const min = p.saleDetails?.priceMin || 0;
                                                            const max = p.saleDetails?.priceMax || 0;
                                                            const unit = p.saleDetails?.priceUnit || '';
                                                            if (max && max !== min && Number(max) > 0) return `₹${Number(min).toLocaleString('en-IN')} - ${Number(max).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                                                            return `₹${Number(min).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                                                        }
                                                        if (p.listingType === 'Rent') {
                                                            const unit = p.rentDetails?.rentUnit || '';
                                                            return `₹${Number(p.rentDetails?.monthlyRent || 0).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`.replace(' /mo', '/mo');
                                                        }
                                                        if (p.listingType === 'Lease') {
                                                            const unit = p.leaseDetails?.leaseUnit || '';
                                                            return `₹${Number(p.leaseDetails?.monthlyLeaseRate || 0).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}/mo`.replace(' /mo', '/mo');
                                                        }
                                                        const unit = p.price?.unit || p.price?.priceUnit || '';
                                                        return `₹${Number(p.price?.amount || 0).toLocaleString('en-IN')} ${unit !== 'Rs' ? unit : ''}`.trim();
                                                    })()}
                                                </p>
                                                {/* Additional Pricing Info */}
                                                <div className="flex gap-4 pt-4 border-t border-white/10 mt-4">
                                                    {selectedProperty.listingType === 'Sale' && selectedProperty.saleDetails?.depositAmount && (
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase text-white/40">Deposit</p>
                                                            <p className="text-xs font-black">₹{selectedProperty.saleDetails.depositAmount} {selectedProperty.saleDetails.depositUnit}</p>
                                                        </div>
                                                    )}
                                                    {selectedProperty.listingType === 'Rent' && selectedProperty.rentDetails?.depositAmount && (
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase text-white/40">Deposit</p>
                                                            <p className="text-xs font-black">₹{selectedProperty.rentDetails.depositAmount} {selectedProperty.rentDetails.depositUnit}</p>
                                                        </div>
                                                    )}
                                                    {selectedProperty.listingType === 'Rent' && selectedProperty.rentDetails?.maintenance && (
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase text-white/40">Maint.</p>
                                                            <p className="text-xs font-black">{selectedProperty.rentDetails.maintenance}</p>
                                                        </div>
                                                    )}
                                                    {selectedProperty.listingType === 'Rent' && selectedProperty.rentDetails?.veraBill && (
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase text-white/40">Vera Bill</p>
                                                            <p className="text-xs font-black">{selectedProperty.rentDetails.veraBill}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/b2b-vendor/properties/edit/${selectedProperty._id}`)}
                                                className="w-14 h-14 bg-white text-slate-900 rounded-3xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
                                            >
                                                <FiEdit2 size={24} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Specifications Grid - type-specific fields */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] flex items-center gap-2">
                                            <div className="w-8 h-[2px] bg-primary-600 rounded-full" /> Detailed Specs
                                        </h4>
                                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                            <div className="space-y-4">
                                                {(() => {
                                                    const bucket = getPropertyBucket(selectedProperty);
                                                    const spec0 = Array.isArray(selectedProperty.specifications) && selectedProperty.specifications[0] ? selectedProperty.specifications[0] : selectedProperty.specifications;
                                                    if (bucket === 'commercial') {
                                                        const area = spec0?.builtUpArea || spec0?.carpetArea;
                                                        const areaUnit = spec0?.builtUpAreaUnit || spec0?.carpetAreaUnit || 'Sq. Ft.';
                                                        return (
                                                            <>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Area</span>
                                                                    <span className="text-xs font-black text-slate-900">{area ? `${area} ${areaUnit}` : 'N/A'}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Floor/Total</span>
                                                                    <span className="text-xs font-black text-slate-900">{(spec0?.floorNumber && spec0?.totalFloors) ? `${spec0.floorNumber}/${spec0.totalFloors}` : (spec0?.floorNumber || spec0?.totalFloors || '—')}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Type</span>
                                                                    <span className="text-xs font-black text-slate-900">{(selectedProperty.propertyTypes && selectedProperty.propertyTypes[0]) || selectedProperty.propertyType || '—'}</span>
                                                                </div>
                                                                {spec0?.ceilingHeight && (
                                                                    <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                        <span className="text-xs font-bold text-slate-400">Ceiling</span>
                                                                        <span className="text-xs font-black text-slate-900">{spec0.ceilingHeight} {spec0.ceilingHeightUnit || ''}</span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    }
                                                    if (bucket === 'flat') {
                                                        return (
                                                            <>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Area</span>
                                                                    <span className="text-xs font-black text-slate-900">{selectedProperty.flatDetails?.carpetArea ? `${selectedProperty.flatDetails.carpetArea} ${selectedProperty.flatDetails.carpetAreaUnit || 'Sq. Ft.'}` : 'N/A'}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Floor/Type</span>
                                                                    <span className="text-xs font-black text-slate-900">{selectedProperty.flatDetails?.flatType ? `${selectedProperty.flatDetails.flatType} on floor ${selectedProperty.flatDetails.floorNumber}` : (selectedProperty.flatDetails?.floorNumber && selectedProperty.flatDetails?.totalFloors ? `${selectedProperty.flatDetails.floorNumber}/${selectedProperty.flatDetails.totalFloors}` : '—')}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Age</span>
                                                                    <span className="text-xs font-black text-slate-900">{selectedProperty.flatDetails?.ageOfProperty || 'N/A'}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                    <span className="text-xs font-bold text-slate-400">Furnishing</span>
                                                                    <span className="text-xs font-black text-slate-900">{selectedProperty.flatDetails?.furnishing || selectedProperty.status?.furnishing || 'N/A'}</span>
                                                                </div>
                                                            </>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                <span className="text-xs font-bold text-slate-400">Area</span>
                                                                <span className="text-xs font-black text-slate-900">{selectedProperty.plotDetails?.plotArea ? `${selectedProperty.plotDetails.plotArea} sq ft` : 'N/A'}</span>
                                                            </div>
                                                            {selectedProperty.propertyType !== 'Plot' && (
                                                                <>
                                                                    <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                        <span className="text-xs font-bold text-slate-400">Floor/Type</span>
                                                                        <span className="text-xs font-black text-slate-900">{selectedProperty.plotDetails?.floors ? `${selectedProperty.plotDetails.floors} floors` : '—'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                        <span className="text-xs font-bold text-slate-400">Age</span>
                                                                        <span className="text-xs font-black text-slate-900">{selectedProperty.plotDetails?.ageOfProperty || selectedProperty.status?.propertyCondition || 'N/A'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center pb-3 border-b border-slate-50 group">
                                                                        <span className="text-xs font-bold text-slate-400">Furnishing</span>
                                                                        <span className="text-xs font-black text-slate-900">{selectedProperty.plotDetails?.furnishing || selectedProperty.status?.furnishing || 'N/A'}</span>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Facilities Chips */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] flex items-center gap-2">
                                            <div className="w-8 h-[2px] bg-primary-600 rounded-full" /> Facilities & Amenities
                                        </h4>
                                        <div className="flex flex-wrap gap-3">
                                            {selectedProperty.facilities?.parking?.length > 0 && selectedProperty.facilities.parking.map(p => (
                                                <div key={p} className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                    <span className="text-[10px] font-black uppercase text-slate-700">Parking: {p}</span>
                                                </div>
                                            ))}
                                            <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className={`w-2 h-2 ${selectedProperty.facilities?.lift === 'Yes' ? 'bg-green-500' : 'bg-slate-200'} rounded-full`} />
                                                <span className="text-[10px] font-black uppercase text-slate-700">Lift: {selectedProperty.facilities?.lift}</span>
                                            </div>
                                            {selectedProperty.facilities?.liftPassenger === 'Yes' && (
                                                <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                    <span className="text-[10px] font-black uppercase text-slate-700">Passenger Lift</span>
                                                </div>
                                            )}
                                            {selectedProperty.facilities?.liftLoading === 'Yes' && (
                                                <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                                    <span className="text-[10px] font-black uppercase text-slate-700">Loading Lift</span>
                                                </div>
                                            )}
                                            <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className={`w-2 h-2 ${(Array.isArray(selectedProperty.facilities?.waterSupply) ? selectedProperty.facilities.waterSupply.length > 0 : selectedProperty.facilities?.waterSupply === 'Yes') ? 'bg-green-500' : 'bg-slate-200'} rounded-full`} />
                                                <span className="text-[10px] font-black uppercase text-slate-700">Water: {Array.isArray(selectedProperty.facilities?.waterSupply) ? selectedProperty.facilities.waterSupply.join(', ') : (selectedProperty.facilities?.waterSupply || 'No')}</span>
                                            </div>
                                            <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                <span className="text-[10px] font-black uppercase text-slate-700">Washroom: {selectedProperty.facilities?.washroom}</span>
                                            </div>
                                            <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className={`w-2 h-2 ${selectedProperty.facilities?.powerBackup === 'Yes' ? 'bg-green-500' : 'bg-slate-200'} rounded-full`} />
                                                <span className="text-[10px] font-black uppercase text-slate-700">Power Backup: {selectedProperty.facilities?.powerBackup}</span>
                                            </div>
                                            <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                                                <span className="text-[10px] font-black uppercase text-slate-700">Furnishing: {selectedProperty.status?.furnishing}</span>
                                            </div>
                                            <div className="pl-3 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                                                <div className={`w-2 h-2 ${selectedProperty.facilities?.fireSafety === 'Yes' ? 'bg-green-500' : 'bg-slate-200'} rounded-full`} />
                                                <span className="text-[10px] font-black uppercase text-slate-700">Fire Safety: {selectedProperty.facilities?.fireSafety}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description Section */}
                                    <div className="space-y-4 p-8 bg-slate-50 rounded-[3rem]">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Vendor Note</h4>
                                        <p className="text-sm text-slate-600 font-bold leading-relaxed italic">
                                            "{selectedProperty.description || 'No detailed description provided.'}"
                                        </p>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="pt-6 text-center border-t border-slate-100">
                                        <p className="text-[9px] font-medium text-slate-300 uppercase tracking-widest">
                                            Property ID: {selectedProperty._id} • Listed on {new Date(selectedProperty.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ManageProperties;
