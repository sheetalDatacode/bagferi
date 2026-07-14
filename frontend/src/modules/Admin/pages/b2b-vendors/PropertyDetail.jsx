import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiHome, FiMapPin, FiCalendar, FiUser, FiMaximize2, FiDollarSign, FiTag } from "react-icons/fi";
import { motion } from "framer-motion";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";
import RatingSummaryBadge from "../../../../shared/components/RatingSummaryBadge";

const PropertyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [property, setProperty] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        fetchProperty();
    }, [id]);

    const fetchProperty = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/properties/${id}`);
            if (response.success) {
                setProperty(response.data);
                if (response.data.media && response.data.media.length > 0) {
                    setSelectedImage(response.data.media[0].url);
                }
            }
        } catch (error) {
            console.error('Error fetching Property:', error);
            toast.error('Failed to load details');
            navigate('/admin/b2b-vendors/properties');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async () => {
        try {
            const response = await api.patch(`/admin/properties/${id}/status`, {
                isActive: !property.isActive
            });
            if (response.success) {
                toast.success(`Property ${!property.isActive ? 'activated' : 'deactivated'}`);
                setProperty({ ...property, isActive: !property.isActive });
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!property) return null;

    const specObj = property.specifications || {};
    const hasValue = (v) => !(v === undefined || v === null || v === '');
    const renderValue = (v) => {
        if (!hasValue(v)) return '-';
        if (Array.isArray(v)) return v.length ? v.join(', ') : '-';
        return String(v);
    };

    const builtUpAreaValue = hasValue(specObj?.builtUpArea) ? specObj?.builtUpArea : property.plotDetails?.builtUpArea;
    const builtUpAreaUnit = specObj?.builtUpAreaUnit || property.plotDetails?.builtUpAreaUnit || 'Sq. Ft.';
    const commonAreaValue = hasValue(property.flatDetails?.commonArea) ? property.flatDetails?.commonArea : property.plotDetails?.commonArea;
    const commonAreaUnit = property.flatDetails?.carpetAreaUnit || property.plotDetails?.builtUpAreaUnit || 'Sq. Ft.';
    const plotAreaValue = property.plotDetails?.plotArea ?? specObj?.plotArea;
    const plotAreaUnit = property.plotDetails?.plotAreaUnit || 'Sq. Ft.';
    const facilities = {
        parking: property.facilities?.parking || ['No'],
        lift: property.facilities?.lift || 'No',
        powerBackup: property.facilities?.powerBackup || 'No',
        waterSupply: property.facilities?.waterSupply || 'No',
        washroom: property.facilities?.washroom || ['Common'],
        fireSafety: property.facilities?.fireSafety || 'No'
    };
    const status = {
        furnishing: property.status?.furnishing || 'Unfurnished',
        propertyCondition: property.status?.propertyCondition || 'New',
        propertyPosition: property.status?.propertyPosition || 'Ready to Move',
        propertyStatus: property.status?.propertyStatus || 'Ready'
    };

    const specCards = [
        { label: "Built Up Area", value: hasValue(builtUpAreaValue) ? `${builtUpAreaValue} ${builtUpAreaUnit}` : "-" },
        { label: "Common Area", value: hasValue(commonAreaValue) ? `${commonAreaValue} ${commonAreaUnit}` : "-" },
        { label: "Plot Area", value: hasValue(plotAreaValue) ? `${plotAreaValue} ${plotAreaUnit}` : "-" },
        { label: "Floor Info", value: hasValue(property.flatDetails?.floorNumber) ? `${property.flatDetails.floorNumber} / ${property.flatDetails.totalFloors || 'N/A'}` : (hasValue(specObj?.floorNumber) ? `${specObj.floorNumber} / ${specObj.totalFloors || 'N/A'}` : (property.plotDetails?.floors || "-")) },
        { label: "Flat Type", value: property.flatDetails?.flatType || "-" },
        { label: "Possession", value: property.flatDetails?.possessionType || property.plotDetails?.possessionType || "-" },
        { label: "Bedrooms", value: hasValue(property.plotDetails?.bedrooms) ? property.plotDetails?.bedrooms : (hasValue(specObj?.bedrooms) ? specObj?.bedrooms : "-") },
        { label: "Bathrooms", value: hasValue(property.plotDetails?.bathrooms) ? property.plotDetails?.bathrooms : (hasValue(specObj?.bathrooms) ? specObj?.bathrooms : "-") },
        { label: "Balcony", value: hasValue(property.plotDetails?.balcony) ? property.plotDetails?.balcony : (hasValue(specObj?.balcony) ? specObj?.balcony : "-") },
        { label: "Ceiling Height", value: hasValue(specObj?.ceilingHeight) ? `${specObj.ceilingHeight} ${specObj?.ceilingHeightUnit || 'Ft.'}` : "-" },
        { label: "Entrance Width", value: hasValue(specObj?.entranceWidth) ? `${specObj.entranceWidth} ${specObj?.entranceWidthUnit || 'Ft.'}` : "-" },
        { label: "Road Facing", value: property.roadFacing || "-" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/admin/b2b-vendors/properties')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <FiArrowLeft /> Back to List
                </button>
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${property.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {property.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                        onClick={toggleStatus}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${property.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                    >
                        {property.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Images */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Hero Image */}
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                        {selectedImage ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                                <img
                                    src={selectedImage}
                                    alt={property.title}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ) : (
                            <div className="w-full h-96 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                                <FiHome size={64} />
                            </div>
                        )}

                        {/* Thumbnails */}
                        {property.media && property.media.length > 0 && (
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-admin">
                                {property.media.map((img, idx) => (
                                    <img
                                        key={idx}
                                        src={img.url}
                                        alt={`Prop ${idx}`}
                                        className={`w-24 h-24 object-cover rounded-lg border-2 cursor-pointer transition-all flex-shrink-0 ${selectedImage === img.url ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-100 hover:border-gray-300'
                                            }`}
                                        onClick={() => setSelectedImage(img.url)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Property Main Info */}
                    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-8">
                        {/* Title & Price */}
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                            <div>
                                <h1 className="lg:hidden text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
                                <div className="mb-2">
                                    <RatingSummaryBadge targetType="property" targetId={property._id} />
                                </div>
                                <div className="flex flex-wrap gap-2 text-gray-500 text-sm">
                                    <div className="flex items-center gap-1">
                                        <FiMapPin className="text-primary-500" />
                                        <span>{property.location?.address}, {property.location?.city}</span>
                                    </div>
                                    <span className="text-gray-300">|</span>
                                    <span>{property.location?.pincode}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                {/* Display Price based on Listing Type */}
                                {property.listingType === 'Sale' && property.saleDetails && (
                                    <>
                                        <p className="text-3xl font-bold text-primary-600">
                                            ₹{property.saleDetails.priceMin || 0} - ₹{property.saleDetails.priceMax || 0} {property.saleDetails.priceUnit}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Selling Price Range</p>
                                    </>
                                )}
                                {property.listingType === 'Rent' && property.rentDetails && (
                                    <>
                                        <p className="text-3xl font-bold text-primary-600">
                                            ₹{property.rentDetails.monthlyRent || 0} {property.rentDetails.rentUnit}/mo
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Monthly Rent</p>
                                    </>
                                )}
                                {property.listingType === 'Lease' && property.leaseDetails && (
                                    <>
                                        <p className="text-3xl font-bold text-primary-600">
                                            ₹{property.leaseDetails.monthlyLeaseRate || 0} {property.leaseDetails.leaseUnit}/mo
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Lease Rate</p>
                                    </>
                                )}
                                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold mt-2 uppercase tracking-wide">
                                    {property.listingType} • {property.propertyType === 'Villa' ? 'Row house / Villa' : property.propertyType}
                                </span>
                            </div>
                        </div>

                        {/* Financial Details Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                            {property.listingType === 'Sale' && property.saleDetails && (
                                <>
                                    {/* Financial details removed for Sale as per user request */}
                                </>
                            )}
                            {property.listingType === 'Rent' && property.rentDetails && (
                                <>
                                    <InfoItem label="Deposit Amount" value={`₹${property.rentDetails.depositAmount || 0} ${property.rentDetails.depositUnit}`} />
                                    <InfoItem label="Maintenance" value={property.rentDetails.maintenance} highlight={property.rentDetails.maintenance === 'Included'} />
                                    <InfoItem label="Vera Bill" value={property.rentDetails.veraBill} highlight={property.rentDetails.veraBill === 'Included'} />
                                </>
                            )}
                            {property.listingType === 'Lease' && property.leaseDetails && (
                                <InfoItem label="Duration" value={`${property.leaseDetails.leaseDurationYears || 0} Years`} />
                            )}
                            <InfoItem label="Created On" value={new Date(property.createdAt).toLocaleDateString()} />
                        </div>

                        {/* Specifications Grid */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Specifications</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {specCards.map((card) => (
                                    <SpecCard key={card.label} label={card.label} value={card.value} />
                                ))}
                            </div>
                        </div>

                        {/* Villa/Plot Form Details */}
                        {property.plotDetails && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Row house / Villa Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <SpecCard label="Master Room" value={renderValue(property.plotDetails.masterRoom)} />
                                    <SpecCard label="Terrace" value={renderValue(property.plotDetails.terrace)} />
                                    <SpecCard label="Furnishing" value={renderValue(property.plotDetails.furnishing)} />
                                    <SpecCard label="Age Of Property" value={renderValue(property.plotDetails.ageOfProperty)} />
                                    <SpecCard label="Common Area" value={renderValue(property.plotDetails.commonArea)} />
                                    <SpecCard label="Possession Type" value={renderValue(property.plotDetails.possessionType)} />
                                    <SpecCard label="Bedrooms" value={renderValue(property.plotDetails.bedrooms)} />
                                    <SpecCard label="Bathrooms" value={renderValue(property.plotDetails.bathrooms)} />
                                    <SpecCard label="Balcony" value={renderValue(property.plotDetails.balcony)} />
                                    <SpecCard label="Floors" value={renderValue(property.plotDetails.floors)} />
                                    <SpecCard label="Game Zone" value={renderValue(property.plotDetails.amenities?.gameZone)} />
                                </div>
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <SpecCard label="Private Parking" value={renderValue(property.plotDetails.privateFacilities?.privateParking)} />
                                    <SpecCard label="Garden Area" value={renderValue(property.plotDetails.privateFacilities?.gardenArea)} />
                                    <SpecCard label="Personal Borewell" value={renderValue(property.plotDetails.privateFacilities?.personalBorewell)} />
                                    <SpecCard label="Solar System" value={renderValue(property.plotDetails.privateFacilities?.solarSystem)} />
                                    <SpecCard label="Store Room" value={renderValue(property.plotDetails.privateFacilities?.storeRoom)} />
                                    <SpecCard label="Servant Room" value={renderValue(property.plotDetails.privateFacilities?.servantRoom)} />
                                </div>
                            </div>
                        )}

                        {/* Flat Form Details */}
                        {property.flatDetails && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Flat Details</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <SpecCard label="Flat Type" value={renderValue(property.flatDetails.flatType)} />
                                    <SpecCard label="Floor Number" value={renderValue(property.flatDetails.floorNumber)} />
                                    <SpecCard label="Total Floors" value={renderValue(property.flatDetails.totalFloors)} />
                                    <SpecCard label="Furnishing" value={renderValue(property.flatDetails.furnishing)} />
                                    <SpecCard label="Age Of Property" value={renderValue(property.flatDetails.ageOfProperty)} />
                                    <SpecCard label="Built-up Area" value={renderValue(property.flatDetails.builtUpArea)} />
                                    <SpecCard label="Common Area" value={renderValue(property.flatDetails.commonArea)} />
                                    <SpecCard label="Possession Type" value={renderValue(property.flatDetails.possessionType)} />
                                    <SpecCard label="Area Unit" value={renderValue(property.flatDetails.carpetAreaUnit)} />
                                    <SpecCard label="Loan Available" value={renderValue(property.flatDetails.legal?.loanAvailable)} />
                                    <SpecCard label="RERA Approved" value={renderValue(property.flatDetails.legal?.reraApproved)} />
                                    <SpecCard label="Game Zone" value={renderValue(property.flatDetails.amenities?.gameZone)} />
                                </div>
                            </div>
                        )}
                        {Array.isArray(property.flatVariants) && property.flatVariants.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Flat BHK Variants</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {property.flatVariants.map((variant, index) => (
                                        <SpecCard
                                            key={`${variant.flatType || 'bhk'}-${index}`}
                                            label={variant.flatType || `Variant ${index + 1}`}
                                            value={`Built-up: ${renderValue(variant.builtUpArea)} ${renderValue(variant.carpetAreaUnit)} | Common: ${renderValue(variant.commonArea)} | Possession: ${renderValue(variant.possessionType)}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Description</h3>
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {property.description || 'No description provided.'}
                            </div>
                        </div>

                        {/* Facilities */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Facilities</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <FacilityItem label="Parking" value={facilities.parking} isArray />
                                <FacilityItem label="Lift" value={facilities.lift} />
                                <FacilityItem label="Power Backup" value={facilities.powerBackup} />
                                <FacilityItem label="Water Supply" value={facilities.waterSupply} />
                                <FacilityItem label="Washroom" value={facilities.washroom} isArray />
                                <FacilityItem label="Fire Safety" value={facilities.fireSafety} />
                            </div>
                        </div>

                        {/* Status Info */}
                        {status && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wide">Status & Condition</h3>
                                <div className="flex flex-wrap gap-3">
                                    <StatusTag label="Furnishing" value={status.furnishing} />
                                    <StatusTag label="Condition" value={status.propertyCondition} />
                                    <StatusTag label="Position" value={status.propertyPosition} />
                                    <StatusTag label="Status" value={status.propertyStatus} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Vendor Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-6">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                            <FiUser className="text-primary-500 text-xl" /> Vendor Details
                        </h3>

                        {property.vendorId ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Store Name</label>
                                    <p className="text-gray-900 font-bold text-xl mt-1">{property.vendorId.storeName}</p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Vendor Name</label>
                                        <p className="text-gray-800 font-medium">{property.vendorId.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Contact Email</label>
                                        <p className="text-gray-800 font-medium truncate" title={property.vendorId.email}>{property.vendorId.email}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Phone</label>
                                        <p className="text-gray-800 font-medium">{property.vendorId.phone}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 uppercase tracking-widest font-bold">Account Status</label>
                                        <div className="mt-2">
                                            <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase ${property.vendorId.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {property.vendorId.status || 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <FiUser className="mx-auto text-gray-300 text-4xl mb-3" />
                                <p className="text-gray-500 font-medium">Vendor information unavailable</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Helper Components
const InfoItem = ({ label, value, highlight }) => (
    <div>
        <span className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">{label}</span>
        <span className={`font-bold text-sm ${highlight ? 'text-green-600' : 'text-gray-800'}`}>{value || '-'}</span>
    </div>
);

const SpecCard = ({ label, value }) => (
    <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-100 hover:border-primary-100 transition-colors">
        <span className="block text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">{label}</span>
        <span className="font-bold text-gray-800">{value === undefined || value === null || value === '' ? '-' : value}</span>
    </div>
);

const FacilityItem = ({ label, value, isArray }) => {
    const displayValue = isArray && Array.isArray(value) ? value.join(', ') : value;
    const isYes = displayValue === 'Yes' || (isArray && value && value.length > 0 && !value.includes('No'));

    return (
        <div className={`p-3 rounded-xl border text-center ${isYes ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
            <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">{label}</span>
            <span className={`font-bold text-sm ${isYes ? 'text-green-700' : 'text-gray-500'}`}>{displayValue || '-'}</span>
        </div>
    );
};

const StatusTag = ({ label, value }) => (
    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100">
        <span className="opacity-70 text-xs uppercase mr-2">{label}:</span>
        {value}
    </div>
);

export default PropertyDetail;
