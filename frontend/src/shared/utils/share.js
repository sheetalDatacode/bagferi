import { isFlutterApp, shareContentOnFlutter } from './flutterBridge';
import toast from 'react-hot-toast';

/**
 * Robust cross-platform share utility
 * @param {Object} shareData - The data to share
 * @param {string} shareData.title - Title of the content
 * @param {string} shareData.text - Description/Text to share
 * @param {string} shareData.url - URL to share
 */
export const handleShare = async ({ title, text, url }) => {
  // 1. Try Flutter Native Bridge first
  if (isFlutterApp()) {
    try {
      const success = await shareContentOnFlutter({ title, text, url });
      if (success) return; 
    } catch (error) {
      console.error('[Share] Flutter bridge failed, falling back...', error);
    }
  }

  // 2. Try Web Share API
  if (navigator.share) {
    try {
      const data = { 
        title: title || 'Dealing India',
        text: text || '',
        url: url 
      };
      
      // Check if data is shareable if canShare is supported
      if (!navigator.canShare || navigator.canShare(data)) {
        await navigator.share(data);
        return; // Success or user cancelled (AbortError)
      }
    } catch (error) {
      // AbortError means user closed the share sheet, which is a "success" in terms of flow
      if (error.name === 'AbortError') {
        return;
      }
      console.error('[Share] Web Share API failed:', error);
    }
  }

  // 3. Fallback: Copy to Clipboard
  try {
    const copyContent = url || text || title || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(copyContent);
      toast.success('Content copied to clipboard');
    } else {
      // Legacy fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = copyContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Content copied to clipboard');
    }
  } catch (error) {
    console.error('[Share] Clipboard fallback failed:', error);
    toast.error('Could not share or copy link');
  }
};
