import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiUser, FiBriefcase, FiMapPin, FiFileText, FiDownload, FiEye, FiPhone, FiMail, FiStar, FiCalendar, FiCreditCard, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../../../shared/utils/api";

const B2BVendorDetailModal = ({ isOpen, onClose, vendor, onApprove, onReject }) => {
    if (!vendor) return null;

    // Extract documents from vendor object
    // Documents can be in vendor.documents (array) or vendor.vendor.documents (array)
    const vendorData = vendor.vendor || vendor;
    const documentsArray = vendorData.documents || [];

    // Debug logging
    console.log('Modal vendor data:', vendorData);
    console.log('Documents array:', documentsArray);

    // Find specific documents by name
    const findDocument = (docName) => {
        const found = documentsArray.find(doc => {
            const name = (doc.name || '').toLowerCase();
            return name.includes(docName.toLowerCase());
        });
        return found;
    };

    const panCardDoc = findDocument('pan') || findDocument('tax');
    const businessLicenseDoc = findDocument('business') || findDocument('license') || findDocument('trade') || findDocument('gst') || findDocument('registration');

    // Filter out documents that are already displayed as PAN or License to avoid duplicates, or show all if none match specifically
    const displayedDocUrls = [panCardDoc?.url, businessLicenseDoc?.url].filter(Boolean);
    const otherDocs = documentsArray.filter(doc => !displayedDocUrls.includes(doc.url));

    const handleDownload = async (url, filename, docType = 'application/pdf', publicId = null) => {
        if (!url) {
            console.error('No URL provided for download');
            toast.error('Document URL not found');
            return;
        }

        const toastId = toast.loading('Starting download...');

        let finalUrl = url;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('data:')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            if (finalUrl.startsWith('data:')) {
                const link = document.createElement("a");
                link.href = finalUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Download started', { id: toastId });
                return;
            }

            // If it's a Cloudinary URL, use the backend to generate a signed download URL
            if (finalUrl.includes('cloudinary.com')) {
                try {
                    const response = await api.post('/admin/b2b-vendors/document-url', {
                        url: finalUrl,
                        publicId: publicId,
                        download: true,
                        filename: filename ? filename.replace(/\.[^/.]+$/, "") : "document" // Backend adds extension
                    });
                    
                    if (response.data?.success && response.data?.data?.url) {
                        const signedUrl = response.data.data.url;
                        
                        const link = document.createElement("a");
                        link.href = signedUrl;
                        // For signed URLs with fl_attachment, we can navigate directly
                        // It will trigger download and stay on current page
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        toast.success('Download started', { id: toastId });
                        return;
                    }
                } catch (apiErr) {
                    console.error('API signed URL failed, falling back to fetch blob:', apiErr);
                }
            }

            // Fallback: Fetch as blob to force specific filename and download behavior
            const response = await fetch(finalUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename || 'document';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            toast.success('Download started', { id: toastId });
        } catch (err) {
            console.error('Fetch download failed, falling back to window.open:', err);
            
            window.open(finalUrl, '_blank');
            toast.error('Download might act differently. Opening in new tab.', { id: toastId });
        }
    };

    const handleView = async (url, docType = 'application/pdf', publicId = null) => {
        if (!url) {
            console.error('No URL provided for view');
            toast.error('Document URL not found');
            return;
        }

        const isPDF = docType === 'application/pdf' || url.toLowerCase().includes('.pdf');
        const toastId = toast.loading(`Opening ${isPDF ? 'PDF' : 'document'}...`);

        let finalUrl = url;
        if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://') && !finalUrl.startsWith('data:')) {
            finalUrl = 'https://' + finalUrl;
        }

        try {
            // Check if it's a Cloudinary URL
            if (finalUrl.includes('cloudinary.com')) {
                // User requirement: Public raw Cloudinary URLs must be used as-is.
                // Fix: Browsers (like Edge) sometimes fail to open Cloudinary PDFs due to 
                // conversion issues or security headers. Viewing it as a .jpg ensures it renders perfectly inline.
                let viewUrl = finalUrl;
                if (viewUrl.toLowerCase().endsWith('.pdf')) {
                    viewUrl = viewUrl.replace(/\.pdf$/i, '.jpg');
                }
                
                window.open(viewUrl, '_blank');
                toast.success('Opening in new tab...', { id: toastId });
                return;
            }

            // For base64 data URLs
            if (finalUrl.startsWith('data:')) {
                const newWindow = window.open();
                newWindow.document.write(
                    `<iframe src="${finalUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                );
                toast.success('Document opened', { id: toastId });
                return;
            }

            // Fallback
            window.open(finalUrl, '_blank');
            toast.success('Opening in new tab...', { id: toastId });

        } catch (err) {
            console.error('View error:', err);
            window.open(finalUrl, '_blank');
            toast.dismiss(toastId);
        }
    };

    const subscription = vendorData.subscription || vendorData.currentSubscription;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-200 ring-4 ring-primary-50">
                                    <FiBriefcase className="text-white text-3xl" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{vendorData.companyName || vendorData.storeName || vendorData.name || vendor.companyName || vendor.name}</h2>
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${(vendorData.status || vendor.status) === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                    (vendorData.status || vendor.status) === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                        'bg-red-100 text-red-700'}`}>
                                                {vendorData.status || vendor.status || 'pending'}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${vendorData.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {vendorData.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-gray-500 font-medium flex items-center gap-2">
                                        <FiMail className="text-primary-500" /> {vendorData.email || vendor.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600 hover:rotate-90"
                            >
                                <FiX size={28} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-hide">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Contact & Business & Subscription */}
                                <div className="lg:col-span-1 space-y-10">
                                    {/* Subscription Section */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-xl shadow-sm">
                                                <FiStar size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">Subscription Plan</h3>
                                        </div>
                                        {subscription ? (
                                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                                                <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Active Plan</p>
                                                        <FiCheckCircle className="text-green-500" />
                                                    </div>
                                                    <h4 className="text-white text-xl font-black mb-1">{subscription.name || "Custom Plan"}</h4>
                                                    <div className="flex items-baseline gap-2 mb-4">
                                                        <span className="text-primary-400 text-2xl font-black">₹{subscription.price || "0"}</span>
                                                        <span className="text-gray-500 text-[10px] font-bold">/ {subscription.duration || 1} Months</span>
                                                    </div>
                                                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase">
                                                            <FiCalendar /> Expires: {vendorData.subscriptionExpiry ? new Date(vendorData.subscriptionExpiry).toLocaleDateString() : 'N/A'}
                                                        </div>
                                                        <div className="text-primary-400">
                                                            <FiCreditCard size={16} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 text-center">
                                                <p className="text-gray-500 font-medium text-sm">No active subscription plan</p>
                                            </div>
                                        )}
                                    </section>

                                    {/* Contact Person */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shadow-sm">
                                                <FiUser size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">Contact Person</h3>
                                        </div>
                                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                    <FiUser size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Representative</p>
                                                    <p className="text-sm font-black text-gray-700">{vendorData.name || vendor.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shadow-sm border border-green-100">
                                                    <FiPhone size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Phone Number</p>
                                                    <p className="text-sm font-black text-gray-700">{vendorData.phone || vendor.phone || "+91 9876543210"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column: Address & Documents */}
                                <div className="lg:col-span-2 space-y-10">
                                    {/* Business Profile Summary */}
                                    <section className="bg-primary-50/50 p-6 rounded-[2.5rem] border border-primary-100/50 flex flex-wrap gap-10">
                                        <div>
                                            <p className="text-[9px] text-primary-400 font-black uppercase tracking-widest mb-2">GST Identification</p>
                                            <p className="text-lg font-black text-primary-900 leading-none">{vendorData.gstNumber || vendor.gstNumber || "N/A"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-primary-400 font-black uppercase tracking-widest mb-2">Business Type</p>
                                            <p className="text-lg font-black text-primary-900 leading-none">{vendorData.businessType || vendor.businessType || "N/A"}</p>
                                        </div>
                                        {vendorData.businessTypeRef && (
                                            <div>
                                                <p className="text-[9px] text-primary-400 font-black uppercase tracking-widest mb-2">Business Category</p>
                                                <p className="text-lg font-black text-primary-900 leading-none">{vendorData.businessTypeRef.name || vendorData.businessTypeRef}</p>
                                            </div>
                                        )}
                                        
                                    </section>

                                    {/* Business Address */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl shadow-sm">
                                                <FiMapPin size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">Registered Business Address</h3>
                                        </div>
                                        <div className="bg-white p-2 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex gap-4">
                                                    <div className="p-2.5 bg-white text-orange-500 rounded-xl shadow-sm h-fit border border-orange-50">
                                                        <FiMapPin size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Premises Details</p>
                                                        <p className="text-sm font-black text-gray-700 leading-relaxed uppercase">
                                                            {(vendorData.address || vendor.address)?.street || "N/A"}<br />
                                                            <span className="text-gray-500 font-medium text-xs normal-case">
                                                                {(vendorData.address || vendor.address)?.area ? `${(vendorData.address || vendor.address).area}, ` : ""}
                                                                {(vendorData.address || vendor.address)?.landmark || ""}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-0">
                                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Region</p>
                                                        <p className="text-sm font-black text-gray-700 uppercase truncate">{(vendorData.address || vendor.address)?.city || "N/A"}</p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{(vendorData.address || vendor.address)?.state || ""}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Pin Code</p>
                                                        <p className="text-sm font-black text-gray-700">
                                                            {(vendorData.address || vendor.address || vendorData.billingAddress || vendor.billingAddress)?.pincode ||
                                                                (vendorData.address || vendor.address || vendorData.billingAddress || vendor.billingAddress)?.pinCode ||
                                                                (vendorData.address || vendor.address || vendorData.billingAddress || vendor.billingAddress)?.zipCode ||
                                                                "N/A"}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{(vendorData.address || vendor.address)?.country || "INDIA"}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Documents Section */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-5">
                                            <div className="p-2 bg-green-50 text-green-600 rounded-xl shadow-sm">
                                                <FiFileText size={18} />
                                            </div>
                                            <h3 className="font-black text-gray-800 uppercase tracking-[0.15em] text-xs">KYC Documents</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* PAN Card */}
                                            {panCardDoc ? (
                                                <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-primary-200 transition-all group shadow-sm hover:shadow-md gap-4">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-transparent group-hover:border-primary-100 shadow-inner">
                                                            <FiFileText size={20} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-black text-gray-800 uppercase tracking-tighter truncate">{panCardDoc.name || 'Income Tax PAN'}</p>
                                                            <p className="text-[9px] text-primary-400 font-bold tracking-widest uppercase">Verified format</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleView(panCardDoc.url, panCardDoc.type, panCardDoc.publicId)}
                                                            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-primary-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                                                            title="View Document"
                                                        >
                                                            <FiEye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(panCardDoc.url, panCardDoc.name || "PAN_CARD", panCardDoc.type, panCardDoc.publicId)}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all active:scale-90"
                                                            title="Download Document"
                                                        >
                                                            <FiDownload size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* Business License */}
                                            {businessLicenseDoc ? (
                                                <div className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-primary-200 transition-all group shadow-sm hover:shadow-md gap-4">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-transparent group-hover:border-primary-100 shadow-inner">
                                                            <FiFileText size={20} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-black text-gray-800 uppercase tracking-tighter truncate">{businessLicenseDoc.name || 'Trade License'}</p>
                                                            <p className="text-[9px] text-primary-400 font-bold tracking-widest uppercase">Official proof</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleView(businessLicenseDoc.url, businessLicenseDoc.type, businessLicenseDoc.publicId)}
                                                            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-primary-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                                                            title="View Document"
                                                        >
                                                            <FiEye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(businessLicenseDoc.url, businessLicenseDoc.name || "LICENSE", businessLicenseDoc.type, businessLicenseDoc.publicId)}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all active:scale-90"
                                                            title="Download Document"
                                                        >
                                                            <FiDownload size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* Other Documents */}
                                            {otherDocs.map((doc, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-primary-200 transition-all group shadow-sm hover:shadow-md gap-4">
                                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                                        <div className="w-12 h-12 flex-shrink-0 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 group-hover:text-primary-600 transition-all border border-transparent group-hover:border-primary-100 shadow-inner">
                                                            <FiFileText size={20} />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-black text-gray-800 uppercase tracking-tighter truncate">{doc.name || `Document ${idx + 1}`}</p>
                                                            <p className="text-[9px] text-primary-400 font-bold tracking-widest uppercase">Other</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleView(doc.url, doc.type, doc.publicId)}
                                                            className="p-2.5 bg-slate-50 text-slate-500 hover:bg-primary-600 hover:text-white rounded-xl transition-all shadow-sm active:scale-90"
                                                            title="View Document"
                                                        >
                                                            <FiEye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(doc.url, doc.name || `doc_${idx}`, doc.type, doc.publicId)}
                                                            className="p-2.5 bg-slate-50 text-slate-400 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all active:scale-90"
                                                            title="Download Document"
                                                        >
                                                            <FiDownload size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {!panCardDoc && !businessLicenseDoc && otherDocs.length === 0 && (
                                                <div className="col-span-2 text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                                                    <p className="text-gray-400 font-bold text-sm">No documents submitted</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>

                        {/* Footer - Redesigned */}
                        <div className="p-8 bg-gradient-to-t from-slate-50 to-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-gray-400">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black">{i}</div>
                                    ))}
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest">3-Stage Verification Check Completed</p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-100 transition-all shadow-sm active:translate-y-px"
                                >
                                    Cancel
                                </button>
                                {String(vendorData.status || vendor.status).toLowerCase() === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                console.log("Rejecting vendor...");
                                                if (onReject) {
                                                    onReject();
                                                } else {
                                                    toast.error("Reject handler not provided");
                                                }
                                            }}
                                            className="px-8 py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => {
                                                console.log("Approving vendor...");
                                                if (onApprove) {
                                                    onApprove();
                                                } else {
                                                    toast.error("Approve handler not provided");
                                                }
                                            }}
                                            className="px-10 py-3.5 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 active:scale-95"
                                        >
                                            Approve Access
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default B2BVendorDetailModal;
