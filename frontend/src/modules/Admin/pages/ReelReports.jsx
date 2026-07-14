import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiTrash2, 
  FiXCircle, 
  FiEye, 
  FiMoreVertical,
  FiFilter,
  FiCalendar,
  FiUser,
  FiVideo
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../../shared/utils/api";
import dayjs from "dayjs";

const getReelYoutubeId = (reel) => {
  if (!reel) return null;
  // Prioritize youtubeVideoId if it exists (from successful upload/sync)
  if (reel.youtubeVideoId) return reel.youtubeVideoId;
  
  // Try to extract from videoUrl if it's a link type
  const url = reel.videoUrl;
  if (!url) return null;

  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|embed\/|shorts\/))([^&?\/ ]{11})/);
  if (match) return match[1];

  // Fallback for other youtube link formats
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const searchParams = new URL(url).searchParams;
    return searchParams.get('v');
  }

  return null;
};

export default function ReelReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewReel, setPreviewReel] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resolutionComment, setResolutionComment] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reels/reports/all?status=${filter}`);
      if (res.success) {
        setReports(res.data.reports);
      }
    } catch (err) {
      toast.error(err.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const handleResolve = async (id, action) => {
    setIsProcessing(true);
    try {
      const res = await api.post(`/admin/reels/reports/${id}/resolve`, {
        action,
        comment: resolutionComment
      });
      if (res.success) {
        toast.success(action === 'delete' ? "Reel deleted and report resolved" : "Report dismissed");
        setSelectedReport(null);
        setResolutionComment("");
        fetchReports();
      }
    } catch (err) {
      toast.error(err.message || "Operation failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-wider border border-amber-500/20">Pending</span>;
      case "resolved":
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">Resolved</span>;
      case "dismissed":
        return <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-500/20">Dismissed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div></div>


        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {["pending", "resolved", "dismissed", ""].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f 
                  ? "bg-primary-600 text-white shadow-md" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              {f || "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl py-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle className="text-slate-400 text-4xl" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Clear Skies!</h3>
          <p className="text-slate-500">No reports found for the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {reports.map((report) => (
              <motion.div
                key={report._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-slate-700 transition-all group"
              >
                {/* Reel Preview Header */}
                <div 
                  className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                  onClick={() => setPreviewReel(report.reelId)}
                >
                  {report.reelId?.thumbnailUrl ? (
                    <img 
                      src={report.reelId.thumbnailUrl} 
                      alt={report.reelId.title} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <FiVideo className="text-white/20 text-4xl" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                  
                  <div className="absolute top-4 left-4">
                    {getStatusBadge(report.status)}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4">
                    <h4 className="text-white font-bold truncate">{report.reelId?.title || "Untitled Reel"}</h4>
                    <p className="text-slate-400 text-xs mt-1">Uploader: {report.reelId?.uploaderName}</p>
                  </div>

                  <button 
                    onClick={() => setPreviewReel(report.reelId)}
                    className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all scale-0 group-hover:scale-100"
                  >
                    <FiEye />
                  </button>
                </div>

                {/* Report Content */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <FiAlertTriangle className="text-red-500 text-sm" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reason</p>
                        <p className="text-white font-medium">{report.reason}</p>
                      </div>
                    </div>

                    {report.comment && (
                      <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Comment</p>
                        <p className="text-slate-300 text-sm italic">"{report.comment}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800 pt-4">
                      <div className="flex items-center gap-1.5">
                        <FiUser />
                        <span>By {report.reporterType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FiCalendar />
                        <span>{dayjs(report.createdAt).format('MMM DD, YYYY')}</span>
                      </div>
                    </div>
                  </div>

                  {report.status === "pending" && (
                    <div className="grid grid-cols-2 gap-3 mt-6">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="col-span-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                      >
                        Take Action
                      </button>
                    </div>
                  )}
                  
                  {report.status !== "pending" && (
                     <div className="mt-6 pt-4 border-t border-slate-800">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Action Taken</p>
                        <p className={`text-sm font-semibold ${report.actionTaken === 'deleted' ? 'text-red-400' : 'text-slate-400'}`}>
                          {report.actionTaken === 'deleted' ? 'Reel Deleted' : 'Report Dismissed'}
                        </p>
                     </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Action Modal */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold text-white">Resolve Report</h3>
                  <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white">
                    <FiXCircle size={28} />
                  </button>
                </div>
                <p className="text-slate-400 text-sm">Decide how to handle this reported content</p>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Admin Note (Internal & For Notification)</label>
                  <textarea
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                    placeholder="Provide a reason for this action..."
                    className="w-full h-32 bg-slate-800/50 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 outline-none focus:border-primary-500 transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleResolve(selectedReport._id, 'dismiss')}
                    className="py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-800 text-slate-300 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="w-4 h-4 border-2 border-slate-600 border-t-white rounded-full animate-spin" /> : <FiTrash2 />}
                    Dismiss Report
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => handleResolve(selectedReport._id, 'delete')}
                    className="py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isProcessing ? <div className="w-4 h-4 border-2 border-red-400 border-t-white rounded-full animate-spin" /> : <FiTrash2 />}
                    Delete Reel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reel Preview Modal */}
      <AnimatePresence>
        {previewReel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewReel(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-sm w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const ytId = getReelYoutubeId(previewReel);
                if (ytId) {
                  return (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&rel=0&modestbranding=1`}
                      className="w-full h-full border-none"
                      title={previewReel.title}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                if (previewReel?.videoUrl) {
                  return (
                    <video
                      src={previewReel.videoUrl}
                      className="w-full h-full object-cover"
                      autoPlay
                      controls
                      loop
                      crossOrigin="anonymous"
                      onError={() => toast.error("Failed to load video file")}
                    />
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                    <FiVideo size={48} />
                    <p className="text-sm">Video source not found</p>
                  </div>
                );
              })()}
              
              <button 
                onClick={() => setPreviewReel(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors z-20"
              >
                <FiXCircle size={24} />
              </button>

              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg">{previewReel.title}</h3>
                <p className="text-white/60 text-sm mt-1">Uploader: {previewReel.uploaderName}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
