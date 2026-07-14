import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiVideo, FiArrowLeft, FiUpload, FiSearch, FiChevronDown, FiCheck, FiX, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import SubscriptionGate from '../components/SubscriptionGate';
import QuotaBanner from '../components/QuotaBanner';
import { useSubscriptionStore } from '../store/subscriptionStore';
import { useB2BVendorAuthStore } from '../store/b2bVendorAuthStore';

const DRAFT_KEY = "b2b_reel_add_draft";

const MAX_VIDEO_MB = 100;
const MAX_DURATION_SECONDS = 60;
const MAX_TITLE = 100;
const MAX_DESC = 500;

export default function UploadReel() {
  const navigate = useNavigate();
  const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
  const { status, canUploadReel, refreshStatus } = useSubscriptionStore();
  const [loading, setLoading] = useState(false);
  const [canUploadDaily, setCanUploadDaily] = useState(true);
  const [enableVideoFileUpload, setEnableVideoFileUpload] = useState(true);
  const [dailyStatusLoading, setDailyStatusLoading] = useState(true);
  const defaultForm = {
    title: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    categoryName: '',
    price: '',
    minimum: '',
  };

  const { vendor } = useB2BVendorAuthStore();
  const vendorId = vendor?._id || vendor?.id || "anonymous";
  const USER_DRAFT_KEY = `${DRAFT_KEY}_${vendorId}`;

  const [form, setForm] = useState(() => {
    const saved = localStorage.getItem(USER_DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultForm, ...parsed.form };
      } catch (e) { console.error("Reel draft load failed", e); }
    }
    return defaultForm;
  });
  const [submissionType, setSubmissionType] = useState('link'); // Default to link as fallback
  const [videoLink, setVideoLink] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef(null);

  // Handle click outside for category dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load B2B categories (used to derive all subcategories for playlist selection)
  useEffect(() => {
    fetchB2BCategories();
  }, [fetchB2BCategories]);

  useEffect(() => {
    const checkDailyStatus = async () => {
      try {
        const res = await api.get("/reels/daily-status");
        if (res.success) {
          setCanUploadDaily(res.data.canUpload);
          // Force disable file upload for now as requested
          const isEnabled = false; // res.data.enableVideoFileUpload !== false;
          setEnableVideoFileUpload(isEnabled);
          
          setSubmissionType("link");
        }
      } catch (err) {
        console.error("Daily status check failed:", err);
      } finally {
        setDailyStatusLoading(false);
      }
    };
    checkDailyStatus();
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (vendorId !== "anonymous") {
      localStorage.setItem(USER_DRAFT_KEY, JSON.stringify({ form }));
    }
  }, [form, USER_DRAFT_KEY, vendorId]);

  // Build the flat list of unique subcategory names across all B2B categories
  // and append extra playlist categories for properties.
  const playlistCategories = useMemo(() => {
    const subs = allCategories.flatMap((cat) => cat.subcategories || []);
    const subNames = subs
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter(Boolean);

    // Also include main category names if they have no subcategories
    const catNames = allCategories
      .filter(cat => !cat.subcategories || cat.subcategories.length === 0)
      .map(cat => cat.name);

    const extra = ['Flat Properties', 'Villa / Row house Properties', 'Commercial Properties'];
    
    // Check vendor's business types to filter categories
    const vendorTypes = vendor?.businessTypes?.map(b => typeof b === 'string' ? b : b.name) || [];
    if (vendor?.businessType) vendorTypes.push(vendor.businessType);
    
    const isRealEstate = vendorTypes.some(t => t?.toLowerCase().includes('real estate') || t?.toLowerCase().includes('property'));
    const isTextile = vendorTypes.length === 0 || vendorTypes.some(t => t?.toLowerCase().includes('textile') || t?.toLowerCase().includes('b2b'));

    let merged = [];
    if (isRealEstate && !isTextile) {
      merged = [...extra];
    } else if (isTextile && !isRealEstate) {
      merged = [...subNames, ...catNames];
    } else {
      merged = [...subNames, ...catNames, ...extra];
    }

    const unique = Array.from(
      new Map(
        merged
          .map((name) => (name || '').trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values()
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [allCategories, vendor]);

  const filteredPlaylistCategories = useMemo(() => {
    if (!categorySearchQuery.trim()) return playlistCategories;
    const query = categorySearchQuery.toLowerCase();
    return playlistCategories.filter(name => 
      (name || '').toLowerCase().includes(query)
    );
  }, [playlistCategories, categorySearchQuery]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_VIDEO_MB}MB`);
      return;
    }
    if (!f.type.startsWith('video/')) {
      toast.error('Please select a video file (mp4, mov, webm, etc.)');
      return;
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  };

  const handlePreviewLoadedMetadata = (event) => {
    const video = event.currentTarget;
    const duration = video.duration;
    if (!Number.isFinite(duration)) return;
    if (duration > MAX_DURATION_SECONDS + 0.25) {
      toast.error(`Video must be ${MAX_DURATION_SECONDS} seconds or shorter`);
      setFile(null);
      setFilePreview(null);
      // Stop playback
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error('Title is required');
      return;
    }
    const categoryName = (form.categoryName || '').trim();
    const isLink = submissionType === 'link';
    if (isLink && !videoLink.trim()) {
      toast.error('Please provide a video link');
      return;
    }
    if (!isLink && !file) {
      toast.error('Please select a video file');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      if (submissionType === 'file' && file) {
        fd.append('video', file);
      } else if (videoLink.trim()) {
        fd.append('videoLink', videoLink.trim());
      }
      
      fd.append('title', form.title.trim().slice(0, MAX_TITLE));
      fd.append('description', (form.description || '').trim().slice(0, MAX_DESC));
      fd.append('categoryName', categoryName);
      fd.append('price', form.price ? Number(form.price) : 0);
      fd.append('minimum', form.minimum || '');
      if (form.categoryId) fd.append('categoryId', form.categoryId);

      const res = await api.post('/reels', fd);
      if (res.success) {
        localStorage.removeItem(USER_DRAFT_KEY);
        toast.success('Reel submitted for moderation. It will go live after admin approval.');
        try { await refreshStatus(); } catch (e) { console.error("Refresh status failed", e); }
        navigate('/b2b-vendor/reels');
      }
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiVideo className="text-primary-600" />
          Upload Reel
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Short promotional video (e.g. product showcase, property tour). Max {MAX_DURATION_SECONDS} seconds and {MAX_VIDEO_MB}MB. It will be reviewed before going live.
      </p>

      <QuotaBanner action="reels" />

      {submissionType === 'file' ? (
        <>
          {!canUploadDaily && !dailyStatusLoading && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-2xl">
                📢
              </div>
              <div>
                <p className="text-amber-900 font-bold mb-1">Daily Limit Reached!</p>
                <p className="text-amber-800 text-sm leading-relaxed">
                  Hello vendor! You have already uploaded 1 reel using "File Upload" today. 
                  <strong> You can still upload more reels by using YouTube Links </strong> below, 
                  or wait until tomorrow to upload another file directly.
                </p>
              </div>
            </div>
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8 shadow-sm">
            <p className="text-blue-900 font-bold mb-2">Hello vendor !</p>
            <p className="text-blue-800 text-sm mb-4">When uploading a reel of your products on dealingindia, note:</p>
            <ul className="space-y-3 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span>Use only the original video and your voice.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">❌</span>
                <span>Videos with any kind of film songs or celebrity voices will not be accepted.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>Due to copyright rules, such videos will be deleted immediately by the admin.</span>
              </li>
            </ul>
          </div>
        </>
      ) : (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 shadow-sm">
          <p className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
            <FiVideo className="text-indigo-600" /> YouTube Shorts kaise upload kare:
          </p>
          <div className="space-y-4">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span>
              <p className="text-indigo-800 text-sm leading-relaxed">YouTube app open kare, Bottom me ➕ (Create) par click kare, <strong>“Create a Short”</strong> select kare</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">2</span>
              <p className="text-indigo-800 text-sm leading-relaxed">Apna product video upload kare</p>
            </div>
            
            <div className="pt-3 border-t border-indigo-100/50">
              <p className="text-indigo-900 font-black mb-2 text-[11px] uppercase tracking-wider">🔗 Link kaise copy kare:</p>
              <ul className="space-y-1.5 text-sm text-indigo-800 font-medium">
                <li className="flex items-center gap-2">• Short video open kare</li>
                <li className="flex items-center gap-2">• Share button dabaye</li>
                <li className="flex items-center gap-2">• “Copy Link” par click kare</li>
              </ul>
            </div>

            <div className="pt-3 border-t border-indigo-100/50">
              <p className="text-rose-700 font-black mb-1 text-[11px] uppercase tracking-wider">📌 Important:</p>
              <p className="text-rose-600 text-sm font-medium">Sirf apne product ka hi video hona chahiye. Dusre ka video ya link 🔗 use kiya to reject ho jayega.</p>
            </div>
            <p className="text-emerald-700 font-bold text-sm pt-2 italic flex items-center gap-2">
              🚀 Quality video upload karoge to jyada buyers milenge!
            </p>
          </div>
        </div>
      )}

      <SubscriptionGate action="reels" showLimitInfo={false} fullPage={true}>
        <form onSubmit={handleSubmit} className="space-y-6">
        
        {submissionType === 'file' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video File *</label>
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-primary-300 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={onFileChange}
                className="hidden"
                id="reel-video"
              />
              <label htmlFor="reel-video" className="cursor-pointer block">
                {filePreview ? (
                  <video
                    src={filePreview}
                    className="mx-auto max-h-64 rounded-xl bg-black"
                    controls
                    muted
                    playsInline
                    crossOrigin="anonymous"
                    onLoadedMetadata={handlePreviewLoadedMetadata}
                  />
                ) : (
                  <div className="py-8">
                    <FiUpload className="mx-auto text-4xl text-gray-400 mb-2" />
                    <p className="text-gray-600 font-medium">Click to select video</p>
                    <p className="text-xs text-gray-400 mt-1">MP4, MOV, WebM, etc. Max {MAX_VIDEO_MB}MB</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">External Video Link *</label>
            <div className="relative">
              <input
                type="url"
                placeholder="Paste YouTube or Direct Video URL (e.g. https://youtu.be/...)"
                className="w-full px-4 py-4 pr-12 border border-gray-100 rounded-2xl focus:ring-1 focus:ring-primary-500 bg-white shadow-sm"
                value={videoLink || ''}
                onChange={(e) => setVideoLink(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary-500">
                <FiVideo size={20} />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-gray-400 font-medium uppercase tracking-[0.05em]">
              Supported: YouTube Links, YouTube Shorts, or Direct MP4 URLs.
            </p>
          </div>
        )}

        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Video Title *
              </label>
              <input
                type="text"
                placeholder="Product name or short catchy title"
                className="w-full px-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                value={form.title || ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={MAX_TITLE}
              />
              <p className="text-xs text-gray-400 mt-1">{form.title.length}/{MAX_TITLE}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 599.50"
                  className="w-full pl-8 pr-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                  value={form.price || ''}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 50 Pcs or 10 kg"
                className="w-full px-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                value={form.minimum || ''}
                onChange={(e) => setForm({ ...form, minimum: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                placeholder="Briefly describe what this video is about..."
                className="w-full px-4 py-2 border border-gray-100 rounded-xl focus:ring-1 focus:ring-primary-500"
                rows={3}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={MAX_DESC}
              />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/{MAX_DESC}</p>
            </div>
        </div>

        <div className="relative" ref={categoryDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className={`w-full px-4 py-3 border rounded-xl flex items-center justify-between transition-all bg-white hover:border-primary-400 ${
                isCategoryDropdownOpen ? 'border-primary-500 ring-2 ring-primary-500/10' : 'border-gray-200'
              }`}
            >
              <span className={form.categoryName ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                {form.categoryName || 'Search or select category'}
              </span>
              <FiChevronDown className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
              >
                {/* Search Header */}
                <div className="p-3 border-b border-gray-50 bg-gray-50/50 sticky top-0">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      placeholder="Type to search category..."
                      value={categorySearchQuery || ''}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                    />
                     {categorySearchQuery && (
                      <div className="flex gap-1 absolute right-3 top-1/2 -translate-y-1/2">
                        <button
                          onClick={() => setCategorySearchQuery('')}
                          className="text-gray-400 hover:text-gray-600 px-1"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Categories List */}
                <div className="overflow-y-auto custom-scrollbar p-1.5">
                  {filteredPlaylistCategories.length > 0 ? (
                    filteredPlaylistCategories.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          // Try to map subcategory name back to its parent category id, if any.
                          let parentCategoryId = '';
                          for (const cat of allCategories) {
                            const subs = cat.subcategories || [];
                            if (subs.some(s => (typeof s === 'string' ? s : s?.name) === name)) {
                              parentCategoryId = (cat.id || cat._id || '').toString();
                              break;
                            }
                          }

                          setForm(f => ({
                            ...f,
                            categoryId: parentCategoryId,
                            categoryName: name,
                          }));
                          setIsCategoryDropdownOpen(false);
                          setCategorySearchQuery('');
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between text-sm transition-colors ${
                          form.categoryName === name 
                          ? 'bg-primary-50 text-primary-700 font-bold' 
                          : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{name}</span>
                        {form.categoryName === name && <FiCheck className="text-primary-600" />}
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-gray-400 text-sm mb-4">No categories found matching "{categorySearchQuery}"</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
          
          <p className="mt-2 text-xs text-gray-400">
            Choose the most specific option (sub-category) to categorize this reel playlist.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || (!file && !videoLink.trim()) || !form.title?.trim()}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white font-black uppercase tracking-widest text-xs hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-100"
          >
            {loading ? 'Processing…' : 'Submit for review'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/b2b-vendor/reels')}
            className="py-3 px-6 rounded-xl border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
      </SubscriptionGate>
    </motion.div>
  );
}
