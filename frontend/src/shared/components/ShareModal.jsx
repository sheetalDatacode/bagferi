import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCopy, FiTwitter, FiFacebook, FiLinkedin, FiMail } from 'react-icons/fi';
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, shareData }) => {
  if (!isOpen) return null;

  const { title = 'Share', text = '', url = window.location.href } = shareData || {};

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: <FaWhatsapp className="text-[#25D366]" />,
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`,
      color: 'hover:bg-[#25D366]/10'
    },
    {
      name: 'Facebook',
      icon: <FiFacebook className="text-[#1877F2]" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: 'hover:bg-[#1877F2]/10'
    },
    {
      name: 'X (Twitter)',
      icon: <FiTwitter className="text-[#000000]" />,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      color: 'hover:bg-gray-100'
    },
    {
      name: 'LinkedIn',
      icon: <FiLinkedin className="text-[#0A66C2]" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      color: 'hover:bg-[#0A66C2]/10'
    },
    {
      name: 'Telegram',
      icon: <FaTelegramPlane className="text-[#0088CC]" />,
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      color: 'hover:bg-[#0088CC]/10'
    },
    {
      name: 'Email',
      icon: <FiMail className="text-gray-600" />,
      url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n\n' + url)}`,
      color: 'hover:bg-gray-100'
    }
  ];

  const handleCopyLink = async () => {
    // Try native share first on mobile
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Check out this ${title} on Dealing India!`,
          url: url,
        });
        return; // Success
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        } else {
          return; // User cancelled
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-gray-100"
        >
          <div className="p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Share This</h2>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Spread the word with your network</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <FiX className="text-gray-400 text-xl" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {shareOptions.map((option) => (
                <a
                  key={option.name}
                  href={option.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-3 transition-all ${option.color} p-4 rounded-3xl group`}
                >
                  <div className="text-3xl transition-transform group-hover:scale-110 group-hover:-rotate-6">
                    {option.icon}
                  </div>
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{option.name}</span>
                </a>
              ))}
            </div>

            <div className="space-y-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block px-2">Or copy direct link</span>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                <input
                  type="text"
                  readOnly
                  value={url}
                  className="flex-1 bg-transparent text-xs font-medium text-gray-400 outline-none truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 active:scale-95"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
