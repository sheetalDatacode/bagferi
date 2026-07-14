import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  FiVideo,
  FiCheck,
  FiX,
  FiTrash2,
  FiPlay,
  FiRefreshCw,
  FiFilter,
  FiChevronDown,
  FiExternalLink,
  FiAlertCircle,
  FiMusic,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import dayjs from 'dayjs';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import { FiSearch } from 'react-icons/fi';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending', color: 'amber' },
  { key: 'approved', label: 'Approved', color: 'emerald' },
  { key: 'rejected', label: 'Rejected', color: 'red' },
  { key: '', label: 'All', color: 'gray' },
];

// Some backends can send "expired" for reels that are effectively approved.
// We normalize that here so the UI only ever shows: pending, approved, rejected.
const normalizeStatus = (status) => {
  if (status === 'expired') return 'approved';
  return status || '';
};

const getReelYoutubeId = (reel) => {
  if (!reel) return null;
  if (reel.youtubeVideoId) return reel.youtubeVideoId;
  const url = (reel.videoUrl || "").toString();
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^&]*&v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
};

export default function ReelModeration() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewReel, setPreviewReel] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [replacingReel, setReplacingReel] = useState(null);
  const [approvedMusic, setApprovedMusic] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [replacingId, setReplacingId] = useState(null);
  const [playingSongId, setPlayingSongId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const [reelTypeFilter, setReelTypeFilter] = useState('link'); // link, upload
  const [onlyBroken, setOnlyBroken] = useState(searchParams.get('onlyBroken') === 'true');

  const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = React.useRef(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

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

  // Compute the same standardized category list used by vendors/buyers
  const playlistCategories = React.useMemo(() => {
    const subs = allCategories.flatMap((cat) => cat.subcategories || []);
    const subNames = subs
      .map((s) => (typeof s === 'string' ? s : s?.name))
      .filter(Boolean);

    // Also include main category names if they have no subcategories
    const catNames = allCategories
      .filter(cat => !cat.subcategories || cat.subcategories.length === 0)
      .map(cat => cat.name);

    const extra = ['Flat Properties', 'Villa / Row house Properties', 'Commercial Properties'];
    const merged = [...subNames, ...catNames, ...extra];

    const unique = Array.from(
      new Map(
        merged
          .map((name) => (name || '').trim())
          .filter(Boolean)
          .map((name) => [name.toLowerCase(), name])
      ).values()
    );

    return unique.sort((a, b) => a.localeCompare(b));
  }, [allCategories]);

  const filteredPlaylistCategories = React.useMemo(() => {
    if (!categorySearchQuery.trim()) return playlistCategories;
    const query = categorySearchQuery.toLowerCase();
    return playlistCategories.filter(name => 
      (name || '').toLowerCase().includes(query)
    );
  }, [playlistCategories, categorySearchQuery]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchB2BCategories();
  }, [fetchB2BCategories]);

  const fetchReels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (statusFilter) params.set('status', statusFilter);
      if (reelTypeFilter) params.set('reelType', reelTypeFilter);
      if (onlyBroken) params.set('onlyBroken', 'true');
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategoryName) params.set('categoryName', selectedCategoryName);

      const res = await api.get(`/admin/reels?${params}`);
      if (res.success) {
        setReels(res.data.reels || []);
        setTotal(res.pagination?.total ?? 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load reels');
      setReels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels();
    setSelectedIds([]); // Reset selection on filter/page change
  }, [statusFilter, reelTypeFilter, onlyBroken, page, debouncedSearch, selectedCategoryName]);

  // Lightweight auto-refresh so new reels and status changes appear without a full page reload
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReels();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [statusFilter, reelTypeFilter, onlyBroken, page, debouncedSearch, selectedCategoryName]);

  const handleApprove = async (reel) => {
    setActionLoading(reel._id);
    try {
      const res = await api.post(`/admin/reels/${reel._id}/approve`);
      if (res.success) {
        toast.success(res.data?.youtubeUploadFailed ? 'Reel approved (YouTube upload failed — video will play from platform)' : 'Reel approved and published to YouTube');
        setPreviewReel(null);
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'Approve failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryYouTube = async (reel) => {
    setActionLoading(`retry-${reel._id}`);
    try {
      const res = await api.post(`/admin/reels/${reel._id}/retry-youtube`);
      if (res.success) {
        toast.success(res.data?.youtubeUploadFailed ? 'YouTube retry failed' : 'YouTube upload retried successfully');
        setPreviewReel(null);
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'YouTube retry failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal) return;
    setActionLoading(showRejectModal._id);
    try {
      await api.post(`/admin/reels/${showRejectModal._id}/reject`, { reason: rejectReason });
      toast.success('Reel rejected');
      setShowRejectModal(null);
      setRejectReason('');
      setPreviewReel(null);
      fetchReels();
    } catch (err) {
      toast.error(err.message || 'Reject failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one reel");
      return;
    }
    setShowBulkConfirm(true);
  };

  const executeBulkApprove = async () => {
    setShowBulkConfirm(false);
    setIsBulkApproving(true);
    try {
      const res = await api.post("/admin/reels/bulk-approve", {
        ids: selectedIds,
      });
      if (res.success) {
        toast.success(
          `Successfully processed bulk approval. Approved: ${res.data.approved}, Failed: ${res.data.failed}`
        );
        setSelectedIds([]);
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || "Bulk approval failed");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reels.filter(r => r.status === 'pending').length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reels.filter(r => r.status === 'pending').map(r => r._id));
    }
  };

  const toggleSelectReel = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async (reel) => {
    if (!window.confirm('Permanently delete this reel?')) return;
    setActionLoading(reel._id);
    try {
      await api.delete(`/admin/reels/${reel._id}`);
      toast.success('Reel deleted');
      setPreviewReel(null);
      setShowRejectModal(null);
      fetchReels();
    } finally {
      setActionLoading(null);
    }
  };


  const fetchMusic = async () => {
    setMusicLoading(true);
    try {
      const res = await api.get('/music/approved');
      if (res.success) setApprovedMusic(res.data.music || []);
    } catch (err) {
      toast.error('Failed to load music library');
    } finally {
      setMusicLoading(false);
    }
  };

  const handleReplaceSong = async (musicId) => {
    if (!replacingReel || !musicId) return;
    setReplacingId(musicId);
    try {
      const res = await api.post(`/reels/${replacingReel._id}/replace-song`, { musicId });
      if (res.success) {
        toast.success(res.message);
        setReplacingReel(null);
        setPreviewReel(null);
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'Replacement failed');
    } finally {
      setReplacingId(null);
    }
  };

  useEffect(() => {
    if (replacingReel) fetchMusic();
    else setPlayingSongId(null);
  }, [replacingReel]);

  useEffect(() => {
    if (!previewReel && !replacingReel) setPlayingSongId(null);
  }, [previewReel, replacingReel]);

  const pages = Math.ceil(total / 12) || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div></div>

        <div className="flex items-center gap-3">
          {statusFilter === 'pending' && reels.some(r => r.status === 'pending') && (
            <button
              type="button"
              onClick={handleBulkApprove}
              disabled={isBulkApproving || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-100 font-bold"
            >
              {isBulkApproving ? (
                <FiRefreshCw className="animate-spin" />
              ) : (
                <FiCheck />
              )}
              Bulk Approve {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchReels()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {statusFilter === 'pending' && reels.some(r => r.status === 'pending') && (
        <div className="flex items-center gap-2 mb-4 bg-primary-50 p-3 rounded-2xl border border-primary-100">
          <input
            type="checkbox"
            id="selectAll"
            checked={selectedIds.length > 0 && selectedIds.length === reels.filter(r => r.status === 'pending').length}
            onChange={toggleSelectAll}
            className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="selectAll" className="text-sm font-bold text-primary-900 cursor-pointer select-none">
            {selectedIds.length === reels.filter(r => r.status === 'pending').length ? 'Deselect All' : 'Select All Pending Reels on this Page'}
          </label>
          <span className="ml-auto text-xs font-medium text-primary-600 bg-white px-2 py-1 rounded-full border border-primary-100">
            {selectedIds.length} items selected
          </span>
        </div>
      )}

      {/* Primary Video Source Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-2xl w-fit mb-6 gap-1 border border-gray-200">
        <button
          onClick={() => { setReelTypeFilter('link'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            reelTypeFilter === 'link' 
              ? 'bg-white text-primary-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiPlay size={16} />
          Video Links
        </button>
        <button
          onClick={() => { setReelTypeFilter('upload'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
            reelTypeFilter === 'upload' 
              ? 'bg-white text-primary-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FiVideo size={16} />
          Uploaded Videos
        </button>
        {reelTypeFilter === 'link' && (
          <button
            onClick={() => {
              const newValue = !onlyBroken;
              setOnlyBroken(newValue);
              setPage(1);
              setSearchParams(prev => {
                if (newValue) prev.set('onlyBroken', 'true');
                else prev.delete('onlyBroken');
                return prev;
              });
            }}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
              onlyBroken 
                ? 'bg-red-500 text-white shadow-lg shadow-red-100' 
                : 'bg-white text-red-500 hover:bg-red-50 border border-red-100'
            }`}
          >
            <FiAlertCircle size={16} />
            Broken Links
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              type="button"
              onClick={() => { setStatusFilter(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${statusFilter === tab.key
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Global Search */}
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, uploader..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Category Filter - Use Same Logic as Upload/Feed */}
        <div className="relative" ref={categoryDropdownRef}>
          <button
            type="button"
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className={`w-[220px] px-4 py-2.5 border rounded-2xl flex items-center justify-between bg-white text-sm font-medium transition-all hover:border-primary-400 shadow-sm ${
              isCategoryDropdownOpen ? 'border-primary-500 ring-2 ring-primary-500/10' : 'border-gray-200'
            }`}
          >
            <span className={selectedCategoryName ? 'text-gray-900' : 'text-gray-500'}>
              {selectedCategoryName || 'All Categories'}
            </span>
            <FiChevronDown className={`transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isCategoryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                className="absolute z-50 left-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
              >
                <div className="p-3 border-b border-gray-50 bg-gray-50/50 sticky top-0">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      autoFocus
                      type="text"
                      className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                      placeholder="Search category..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                    />
                    {categorySearchQuery && (
                      <button
                        onClick={() => setCategorySearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto p-1.5 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryName('');
                      setIsCategoryDropdownOpen(false);
                      setPage(1);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                      selectedCategoryName === '' 
                      ? 'bg-primary-50 text-primary-700 font-bold' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Categories
                  </button>
                  {filteredPlaylistCategories.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryName(name);
                        setIsCategoryDropdownOpen(false);
                        setCategorySearchQuery('');
                        setPage(1);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl flex items-center justify-between text-sm transition-colors ${
                        selectedCategoryName === name 
                        ? 'bg-primary-50 text-primary-700 font-bold' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{name}</span>
                      {selectedCategoryName === name && <FiCheck className="text-primary-600" />}
                    </button>
                  ))}
                  {filteredPlaylistCategories.length === 0 && (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      No matching categories
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[9/16] max-h-[280px]" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-16 text-center">
          <FiVideo className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No reels found</p>
          <p className="text-sm text-gray-400 mt-1">
            {statusFilter === 'pending' ? 'Vendors and users can upload reels for your review.' : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reels.map((reel) => (
              <motion.div
                key={reel._id}
                layout
                className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div 
                  className="w-full h-[400px] bg-gray-900 relative group overflow-hidden cursor-pointer"
                  onClick={() => setPreviewReel(reel)}
                >
                  {reel.status === 'pending' && (
                    <div className="absolute top-3 left-3 z-20">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(reel._id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectReel(reel._id);
                        }}
                        className="w-6 h-6 rounded-lg border-2 border-white/50 bg-black/30 text-primary-600 focus:ring-primary-500 cursor-pointer backdrop-blur-sm transition-all checked:scale-110"
                      />
                    </div>
                  )}
                  {getReelYoutubeId(reel) ? (
                    <img
                      src={`https://img.youtube.com/vi/${getReelYoutubeId(reel)}/hqdefault.jpg`}
                      className="w-full h-full object-cover"
                      alt={reel.title}
                    />
                  ) : reel.videoUrl ? (
                    <video
                      src={reel.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      crossOrigin="anonymous"
                      preload="metadata"
                      poster={reel.thumbnailUrl}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <FiVideo className="text-4xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setPreviewReel(reel); }}
                      className="p-3 rounded-full bg-white/90 text-gray-900 hover:bg-white transition-colors"
                      title="Preview"
                    >
                      <FiPlay className="text-lg" />
                    </button>
                    {reel.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleApprove(reel); }}
                          disabled={actionLoading === reel._id}
                          className="p-3 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                          title="Approve"
                        >
                          {actionLoading === reel._id ? (
                            <FiRefreshCw className="text-lg animate-spin" />
                          ) : (
                            <FiCheck className="text-lg" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowRejectModal(reel); }}
                          className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
                          title="Reject"
                        >
                          <FiX className="text-lg" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(reel); }}
                          disabled={actionLoading === reel._id}
                          className="p-3 rounded-full bg-gray-600 text-white hover:bg-gray-700"
                          title="Delete"
                        >
                          <FiTrash2 className="text-lg" />
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setReplacingReel(reel); }}
                      className="p-3 rounded-full bg-indigo-500 text-white hover:bg-indigo-600"
                      title="Replace Song"
                    >
                      <FiMusic className="text-lg" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${normalizeStatus(reel.status) === 'pending'
                        ? 'bg-amber-500/90 text-white'
                        : normalizeStatus(reel.status) === 'approved'
                          ? 'bg-emerald-500/90 text-white'
                          : normalizeStatus(reel.status) === 'rejected'
                            ? 'bg-red-500/90 text-white'
                            : 'bg-gray-500/90 text-white'
                        }`}
                    >
                      {normalizeStatus(reel.status)}
                    </span>
                    {reel.reelType === 'link' && (
                      <span className={`ml-1 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${
                        reel.isYouTubeLinkValid === false 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-blue-600 text-white'
                      }`}>
                        {reel.isYouTubeLinkValid === false ? 'Broken Link' : 'Link'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 truncate">{reel.title}</h3>

                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{reel.categoryName}{reel.price > 0 && ` · ₹${reel.price}`} · {reel.uploaderName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{dayjs(reel.createdAt).format('MMM D, YYYY HH:mm')}</p>
                  {normalizeStatus(reel.status) === 'rejected' && reel.rejectReason && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 line-clamp-2" title={reel.rejectReason}>
                      <span className="font-semibold">Reason:</span> {reel.rejectReason}
                    </div>
                  )}
                  {/* Always show "View on YouTube" when reel is on YouTube; never remove it */}
                  {(reel.youtubeVideoId || (normalizeStatus(reel.status) === 'approved' && reel.youtubeUploadFailed)) && (
                    <div className="mt-2">
                      {reel.youtubeVideoId ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${reel.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          <FiExternalLink className="flex-shrink-0" /> View on YouTube
                        </a>
                      ) : (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                          <p className="flex items-center gap-1 font-semibold">
                            <FiAlertCircle className="flex-shrink-0" /> YouTube upload failed
                          </p>
                          {reel.youtubeUploadError && (
                            <p className="mt-1 text-amber-700 break-words">
                              {reel.youtubeUploadError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {normalizeStatus(reel.status) === 'approved' && reel.youtubeUploadFailed && (
                    <button
                      type="button"
                      onClick={() => handleRetryYouTube(reel)}
                      disabled={actionLoading === `retry-${reel._id}`}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
                    >
                      {actionLoading === `retry-${reel._id}` ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiRefreshCw />
                      )}
                      Retry YouTube Upload
                    </button>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewReel(reel)}
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Preview
                    </button>
                    {reel.status === 'pending' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(reel)}
                          disabled={actionLoading === reel._id}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRejectModal(reel)}
                          className="text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(reel)}
                          disabled={actionLoading === reel._id}
                          className="text-xs font-medium text-gray-600 hover:text-gray-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {previewReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewReel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Video Section */}
              <div className="flex-1 bg-black relative flex items-center justify-center p-2 md:p-6 min-h-[400px]">
                <div className="relative w-full h-full max-w-[400px] aspect-[9/16] bg-gray-900 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-gray-800">
                  {getReelYoutubeId(previewReel) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${getReelYoutubeId(previewReel)}?autoplay=1&mute=0&rel=0`}
                      className="w-full h-full"
                      title={previewReel.title}
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : previewReel.videoUrl && (
                    <video
                      src={previewReel.videoUrl}
                      controls
                      autoPlay
                      loop
                      muted={!!playingSongId}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  onClick={() => setPreviewReel(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 md:hidden z-10"
                >
                  <FiX />
                </button>
              </div>

              {/* Info Section */}
              <div className="w-full md:w-[350px] flex flex-col bg-white overflow-y-auto">
                <div className="p-6 flex-1">
                  <div className="hidden md:flex justify-between items-start mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Reel Details</h2>
                    <button onClick={() => setPreviewReel(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                      <FiX className="text-xl text-gray-500" />
                    </button>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 break-words">{previewReel.title}</h3>
                  <div className="mt-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</span>
                      <p className="text-sm text-gray-600 leading-relaxed">{previewReel.description || 'No description provided.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</span>
                        <p className="text-sm font-medium text-gray-900">{previewReel.categoryName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Uploader</span>
                        <p className="text-sm font-medium text-gray-900 truncate">{previewReel.uploaderName}</p>
                      </div>
                    </div>

                    <div className="pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</span>
                        <p className="text-sm text-gray-500">{dayjs(previewReel.createdAt).format('MMMM D, YYYY')}</p>
                      </div>
                      {previewReel.price > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Price</span>
                          <p className="text-sm font-bold text-primary-600">₹{previewReel.price}</p>
                        </div>
                      )}
                      {previewReel.minimum && (
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Minimum</span>
                          <p className="text-sm font-bold text-indigo-600">Min: {previewReel.minimum}</p>
                        </div>
                      )}
                    </div>

                    {previewReel.musicId && (
                      <div className="pt-4 border-t border-gray-50">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Audio</span>
                        <div className="mt-2 flex items-center gap-3 p-3 rounded-2xl bg-primary-50 border border-primary-100">
                          <button
                            type="button"
                            onClick={() => setPlayingSongId(playingSongId === previewReel.musicId._id ? null : previewReel.musicId._id)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm ${playingSongId === previewReel.musicId._id 
                              ? 'bg-rose-500 text-white animate-pulse' 
                              : 'bg-white text-primary-600 hover:bg-gray-50'}`}
                          >
                            {playingSongId === previewReel.musicId._id ? (
                                <div className="flex items-center gap-0.5">
                                  <div className="w-1 h-3 bg-white rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0s' }}></div>
                                  <div className="w-1 h-4 bg-white rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0.2s' }}></div>
                                  <div className="w-1 h-2 bg-white rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            ) : (
                              <FiPlay className="ml-0.5" />
                            )}
                          </button>
                          
                          {playingSongId === previewReel.musicId._id && (
                            <audio
                              src={previewReel.musicId.fileUrl}
                              autoPlay
                              onEnded={() => setPlayingSongId(null)}
                              onError={() => setPlayingSongId(null)}
                            />
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{previewReel.musicId.title}</p>
                            <p className="text-[10px] text-gray-500 truncate">{previewReel.musicId.artist}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {normalizeStatus(previewReel.status) === 'rejected' && previewReel.rejectReason && (
                    <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase mb-1">Rejection Reason</p>
                      <p className="text-sm text-red-700">{previewReel.rejectReason}</p>
                    </div>
                  )}

                  {(previewReel.youtubeVideoId || (normalizeStatus(previewReel.status) === 'approved' && previewReel.youtubeUploadFailed)) && (
                    <div className="mt-6">
                      {previewReel.youtubeVideoId ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${previewReel.youtubeVideoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
                        >
                          <FiExternalLink /> View on YouTube
                        </a>
                      ) : (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex gap-3">
                          <FiAlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-amber-700">
                            <p className="font-semibold">YouTube upload failed.</p>
                            <p className="mt-1">Video is currently playing from the platform.</p>
                            {previewReel.youtubeUploadError && (
                              <p className="mt-1 break-words">{previewReel.youtubeUploadError}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {normalizeStatus(previewReel.status) === 'approved' && previewReel.youtubeUploadFailed && (
                    <button
                      type="button"
                      onClick={() => handleRetryYouTube(previewReel)}
                      disabled={actionLoading === `retry-${previewReel._id}`}
                      className="mt-4 w-full py-3 rounded-2xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 disabled:opacity-50 shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                    >
                      {actionLoading === `retry-${previewReel._id}` ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                      Retry YouTube Upload
                    </button>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                  {previewReel.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleApprove(previewReel)}
                        disabled={actionLoading === previewReel._id}
                        className="py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-100 flex items-center justify-center transition-all active:scale-95"
                      >
                        {actionLoading === previewReel._id ? <FiRefreshCw className="animate-spin" /> : 'Approve Reel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPreviewReel(null); setShowRejectModal(previewReel); }}
                        className="py-3 rounded-2xl bg-white border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all active:scale-95"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setReplacingReel(previewReel)}
                    className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                  >
                    <FiMusic /> Replace Audio
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(previewReel)}
                    disabled={actionLoading === previewReel._id}
                    className="w-full py-3 rounded-2xl text-gray-500 font-bold text-xs hover:text-red-600 transition-colors"
                  >
                    Delete Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-gray-900">Reject reel</h3>
              <p className="text-sm text-gray-500 mt-1">{showRejectModal.title}</p>
              <label className="block text-sm font-medium text-gray-700 mt-4">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Copyright issues, poor quality, off-topic..."
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                rows={3}
              />
              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading === showRejectModal._id}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Selection Modal */}
      <AnimatePresence>
        {replacingReel && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              onClick={() => !replacingId && setReplacingReel(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Choose Approved Music</h2>
                  <p className="text-xs text-gray-500">Pick a non-copyrighted song for "{replacingReel.title}"</p>
                </div>
                <button onClick={() => setReplacingReel(null)} disabled={replacingId !== null}>
                  <FiX className="text-xl text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
                {musicLoading ? (
                  <div className="py-12 flex justify-center">
                    <FiRefreshCw className="animate-spin text-3xl text-primary-600" />
                  </div>
                ) : approvedMusic.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <FiMusic className="mx-auto text-4xl mb-2 opacity-20" />
                    No approved music available.
                  </div>
                ) : (
                  approvedMusic.map((song) => (
                    <div
                      key={song._id}
                      className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group"
                    >
                      <button
                        type="button"
                        onClick={() => setPlayingSongId(playingSongId === song._id ? null : song._id)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shadow-sm ${playingSongId === song._id 
                          ? 'bg-rose-500 text-white animate-pulse' 
                          : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}
                      >
                        {playingSongId === song._id ? (
                          <div className="flex items-center gap-0.5">
                            <div className="w-1 h-3 bg-white rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0s' }}></div>
                            <div className="w-1 h-4 bg-white rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1 h-2 bg-white rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        ) : (
                          <FiPlay className="ml-0.5" />
                        )}
                      </button>

                      {playingSongId === song._id && (
                        <audio
                          src={song.fileUrl}
                          autoPlay
                          onEnded={() => setPlayingSongId(null)}
                          onError={() => { toast.error('Failed to load audio'); setPlayingSongId(null); }}
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{song.title}</h4>
                        <p className="text-xs text-gray-500">{song.artist} • {song.genre}</p>
                      </div>
                      <button
                        onClick={() => handleReplaceSong(song._id)}
                        disabled={replacingId !== null}
                        className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 disabled:opacity-50 transition-opacity"
                      >
                        {replacingId === song._id ? 'Applying...' : 'Select'}
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-gray-50 text-[10px] text-gray-400 text-center border-t">
                Applying a new song will submit the reel for re-approval.
              </div>
            </motion.div>
          </div >
        )}
      </AnimatePresence>

      {/* Bulk Approval Confirmation Modal */}
      <AnimatePresence>
        {showBulkConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowBulkConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <FiVideo className="text-2xl text-emerald-600" />
              </div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-gray-900">
                  Bulk Approval
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Are you sure you want to approve{" "}
                  <span className="font-bold text-emerald-600">
                    {selectedIds.length}
                  </span>{" "}
                  reels at once? This will publish them to YouTube and make them live.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={executeBulkApprove}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center transition-all active:scale-95"
                >
                  Yes, Approve All
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkConfirm(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-all active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
