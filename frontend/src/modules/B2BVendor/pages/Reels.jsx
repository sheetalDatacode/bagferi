import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiVideo, FiPlus, FiClock, FiCheck, FiX, FiPlay, FiTrash2, FiMusic, FiAlertTriangle, FiRefreshCw, FiSearch, FiChevronDown } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';
import { getSocket } from '../../../shared/utils/socket';
import { useB2BCategoryStore } from '../../../shared/store/b2bCategoryStore';
import dayjs from 'dayjs';

export default function Reels() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewReel, setPreviewReel] = useState(null);
  const [replacingReel, setReplacingReel] = useState(null);
  const [replacingId, setReplacingId] = useState(null);
  const [approvedMusic, setApprovedMusic] = useState([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [reelTypeFilter, setReelTypeFilter] = useState('link'); // Default to Links

  const { categories: allCategories, initialize: fetchB2BCategories } = useB2BCategoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = React.useRef(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('');

  const getReelYoutubeId = (reel) => {
    if (!reel) return null;
    if (reel.youtubeVideoId) return reel.youtubeVideoId;
    const url = (reel.videoUrl || "").toString();
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?[^&]*&v=|embed\/|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : null;
  };

  const fetchReels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, reelType: reelTypeFilter });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (selectedCategoryName) params.set('categoryName', selectedCategoryName);
      
      const res = await api.get(`/reels/my?${params}`);
      if (res.success) {
        setReels(res.data.reels || []);
        setTotal(res.pagination?.total || 0);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load reels');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      const res = await api.delete(`/reels/${id}`);
      if (res.success) {
        toast.success('Reel deleted successfully');
        fetchReels();
      }
    } catch (err) {
      toast.error(err.message || 'Delete failed');
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
  }, [replacingReel]);


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

  const [enableVideoFileUpload, setEnableVideoFileUpload] = useState(true);
  const [dailyStatusLoading, setDailyStatusLoading] = useState(true);

  // ... existing fetchReels and other logic ...

  useEffect(() => {
    const checkSettings = async () => {
      try {
        const res = await api.get("/reels/daily-status");
        if (res.success) {
          const isEnabled = res.data.enableVideoFileUpload !== false;
          setEnableVideoFileUpload(isEnabled);
          if (!isEnabled && reelTypeFilter === 'upload') {
            setReelTypeFilter('link');
          }
        }
      } catch (err) {
        console.error("Failed to fetch reel settings:", err);
      } finally {
        setDailyStatusLoading(false);
      }
    };
    checkSettings();
  }, []);

  useEffect(() => {
    fetchB2BCategories();
  }, [fetchB2BCategories]);

  useEffect(() => {
    fetchReels();
  }, [page, reelTypeFilter, debouncedSearch, selectedCategoryName]);

  // Real-time update listener for reel status changes
  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleNotification = (notif) => {
        if (notif.type === 'reel_status') {
          toast.success(notif.message || 'One of your reels status has been updated!');
          fetchReels();
        }
      };
      
      socket.on('new_notification', handleNotification);
      return () => socket.off('new_notification', handleNotification);
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FiVideo className="text-primary-600" />
            My Reels
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage your short videos and track their performance.</p>
        </div>
        <button
          onClick={() => navigate('/b2b-vendor/reels/upload')}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all active:scale-95"
        >
          <FiPlus />
          Upload Reel
        </button>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="flex p-1 bg-gray-100/80 backdrop-blur-sm rounded-2xl w-fit gap-1">
          <button
            onClick={() => { setReelTypeFilter('link'); setPage(1); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              reelTypeFilter === 'link' 
                ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/[0.05]' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
            }`}
          >
            <FiPlay size={16} />
            Video Links
          </button>
          {enableVideoFileUpload && (
            <button
              onClick={() => { setReelTypeFilter('upload'); setPage(1); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                reelTypeFilter === 'upload' 
                  ? 'bg-white text-primary-600 shadow-sm ring-1 ring-black/[0.05]' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <FiVideo size={16} />
              Uploaded Videos
            </button>
          )}
        </div>

        {/* Global Search */}
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description..."
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Category Filter */}
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
                className="absolute z-50 left-0 sm:left-auto sm:right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[400px]"
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
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-[9/16] bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : reels.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl py-24 text-center">
          <FiVideo className="mx-auto text-5xl text-gray-300 mb-4" />
          <h3 className="text-gray-900 font-bold">No reels yet</h3>
          <p className="text-gray-500 mt-1 mb-6">Start sharing your products through short videos.</p>
          <button
            onClick={() => navigate('/b2b-vendor/reels/upload')}
            className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
          >
            Upload your first reel
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {reels.map((reel) => (
              <div key={reel._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                <div 
                  className="w-full h-[400px] bg-gray-900 relative overflow-hidden group cursor-pointer"
                  onClick={() => setPreviewReel(reel)}
                >
                  {getReelYoutubeId(reel) ? (
                    <img
                      src={`https://img.youtube.com/vi/${getReelYoutubeId(reel)}/hqdefault.jpg`}
                      className="w-full h-full object-cover"
                      alt={reel.title}
                    />
                  ) : (
                    <video
                      src={reel.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      crossOrigin="anonymous"
                      preload="metadata"
                      poster={reel.thumbnailUrl}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewReel(reel); }}
                      className="p-3 rounded-full bg-white/90 text-gray-900 hover:bg-white transition-colors"
                    >
                      <FiPlay fill="currentColor" />
                    </button>
                  </div>
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      (reel.status === 'approved' || reel.status === 'expired') ? 'bg-emerald-500 text-white' :
                      reel.status === 'pending' ? 'bg-amber-500 text-white' :
                        'bg-red-500 text-white'
                      }`}>
                      {reel.status === 'expired' ? 'approved' : reel.status}
                    </span>
                    {reel.reelType === 'link' && (
                      <span className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                        Link
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{reel.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{reel.categoryName} · {dayjs(reel.createdAt).format('MMM D, YYYY')}{reel.price > 0 && ` · ₹${reel.price}`}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(reel._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete reel"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                  {reel.status === 'rejected' && reel.rejectReason && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 line-clamp-2" title={reel.rejectReason}>
                      <span className="font-semibold">Reason:</span> {reel.rejectReason}
                    </div>
                  )}

                  {reel.isCopyrighted && (
                    <div className="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <div className="flex items-center gap-2 text-orange-700 mb-2">
                        <FiAlertTriangle className="shrink-0" />
                        <span className="text-xs font-bold">Copyright Issue</span>
                      </div>
                      <button
                        onClick={() => setReplacingReel(reel)}
                        className="w-full py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiMusic /> Replace Song
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {total > 12 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">Page {page} of {Math.ceil(total / 12)}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 12)}
                className="px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Fullscreen preview modal */}
      <AnimatePresence>
        {previewReel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black"
              onClick={() => setPreviewReel(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden"
            >
              <button
                onClick={() => setPreviewReel(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
              >
                <FiX size={20} />
              </button>
              {getReelYoutubeId(previewReel) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getReelYoutubeId(previewReel)}?autoplay=1&mute=0&rel=0`}
                  className="w-full h-full border-0"
                  title={previewReel.title}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <video
                  src={previewReel.videoUrl}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  playsInline
                  crossOrigin="anonymous"
                />
              )}
            </motion.div>
          </div>
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
                    No approved music available. Please contact admin.
                  </div>
                ) : (
                  approvedMusic.map((song) => (
                    <div
                      key={song._id}
                      className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                        <FiMusic />
                      </div>
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
                Applying a new song will submit the reel for re-approval by admin.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
