import React from 'react';
import { Link } from 'react-router-dom';
import { FiPlayCircle } from 'react-icons/fi';

const LiveReelCard = ({ reel }) => {
    const getReelYoutubeId = (r) => {
        if (!r) return null;
        if (r.youtubeVideoId) return r.youtubeVideoId;
        if (r.reelType === 'link' && r.externalLinkType === 'youtube') {
            const url = r.videoUrl || '';
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|embed\/|shorts\/))([^&?\/ ]{11})/);
            return match ? match[1] : null;
        }
        return null;
    };

    const ytId = getReelYoutubeId(reel);
    // Fallback for fields
    const thumbnailUrl = reel?.thumbnailUrl || reel?.thumbnail || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://placehold.co/300x500/f8fafc/94a3b8?text=Product+Video');
    const title = reel?.title || reel?.description || 'Featured Product Video';
    const discount = reel?.discount || 'Watch Now';
    const productId = reel?.productId?._id || reel?.productId?.id || reel?.productId;
    const targetPath = productId ? `/b2b/product/${productId}` : (reel?._id ? `/b2b/reels/${reel._id}` : '#');

    return (
        <Link 
            to={targetPath} 
            className="block relative w-36 md:w-44 h-56 md:h-64 rounded-xl overflow-hidden shrink-0 group hover:shadow-lg transition-all"
        >
            {/* Background Image/Video Thumbnail */}
            {ytId ? (
                <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&modestbranding=1&playsinline=1`}
                    className="absolute inset-0 w-[150%] h-[150%] left-[-25%] top-[-25%] object-cover pointer-events-none"
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                ></iframe>
            ) : reel?.videoUrl ? (
                <video 
                    src={reel.videoUrl} 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                    className="w-full h-full object-cover pointer-events-none" 
                />
            ) : (
                <img 
                    src={thumbnailUrl} 
                    alt={title} 
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
            )}
            
            {/* Dark Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80"></div>
            
            {/* Play Icon (Optional, appears on hover) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <FiPlayCircle className="text-white text-4xl drop-shadow-md" />
            </div>

            {/* Bottom Content */}
            <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center text-center">
                <div className="bg-gray-900/80 text-white text-[10px] font-bold px-3 py-1 rounded-full mb-1.5 backdrop-blur-sm border border-gray-700/50 truncate w-[90%]">
                    {discount}
                </div>
                <h4 className="text-white font-bold text-xs line-clamp-1 drop-shadow-sm w-full">
                    {title}
                </h4>
            </div>
        </Link>
    );
};

export default LiveReelCard;
