import React from 'react';
import { Link } from 'react-router-dom';
import { FiPlayCircle } from 'react-icons/fi';

const LiveReelCard = ({ reel }) => {
    // Fallback for fields
    const thumbnailUrl = reel?.thumbnail || reel?.videoUrl || 'https://via.placeholder.com/300x500?text=Live+Video';
    const title = reel?.title || reel?.description || 'Exclusive Live Deals';
    const discount = reel?.discount || 'Extra 10% Off';

    return (
        <Link 
            to={reel?._id ? `/b2b/reel/${reel._id}` : '#'} 
            className="block relative w-36 md:w-44 h-56 md:h-64 rounded-xl overflow-hidden shrink-0 group hover:shadow-lg transition-all"
        >
            {/* Background Image/Video Thumbnail */}
            <img 
                src={thumbnailUrl} 
                alt={title} 
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            
            {/* Dark Gradient Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80"></div>

            {/* LIVE Badge */}
            <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                LIVE
            </div>
            
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
