import React, { useState, useEffect } from 'react';
import { FiPlayCircle, FiVideo } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../../shared/utils/api';

/**
 * Fetches YouTube playlist for a category and embeds it.
 * Used on catalog/category pages for long-term video discovery after reels expire from the 24h feed.
 */
export default function CategoryPlaylistEmbed({ categoryName, title = 'Videos from this category', className = '' }) {
  const navigate = useNavigate();
  const [playlistId, setPlaylistId] = useState(null);
  const [loading, setLoading] = useState(!!categoryName);

  useEffect(() => {
    if (!categoryName || categoryName === 'All') {
      setPlaylistId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/reels/playlist/${encodeURIComponent(categoryName)}`)
      .then((res) => {
        if (res.success && res.data?.youtubePlaylistId) {
          setPlaylistId(res.data.youtubePlaylistId);
        } else {
          setPlaylistId(null);
        }
      })
      .catch(() => setPlaylistId(null))
      .finally(() => setLoading(false));
  }, [categoryName]);

  if (loading || !playlistId) return null;

  const handleOpenReels = () => {
    const target = `/b2b/reels?category=${encodeURIComponent(categoryName)}`;
    navigate(target);
  };

  return (
    <button
      type="button"
      onClick={handleOpenReels}
      className={`w-full rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm text-left transition-all hover:shadow-md ${className}`}
    >
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <FiVideo className="text-primary-600" />
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <div className="relative aspect-video max-h-[320px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center">
        <FiPlayCircle className="text-white/90 text-6xl drop-shadow" />
        <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
          View Reels
        </div>
      </div>
    </button>
  );
}
