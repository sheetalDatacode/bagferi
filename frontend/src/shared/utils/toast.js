import { toast as hotToast } from 'react-hot-toast';

/**
 * Enhanced toast utility with built-in deduplication
 * Ensures that for any given message, only one toast exists at a time.
 */
const toast = {
    /**
     * Show success toast with deduplication
     */
    success: (message, options = {}) => {
        if (!message) return null;
        const id = options.id || (typeof message === 'string' ? message : undefined);
        return hotToast.success(message, { ...options, id });
    },

    /**
     * Show error toast with deduplication
     */
    error: (message, options = {}) => {
        if (!message) return null;
        const id = options.id || (typeof message === 'string' ? message : undefined);
        return hotToast.error(message, { ...options, id });
    },

    /**
     * Show loading toast
     */
    loading: (message, options = {}) => {
        return hotToast.loading(message, options);
    },

    /**
     * Dismiss toast
     */
    dismiss: (toastId) => {
        return hotToast.dismiss(toastId);
    },

    /**
     * Custom toast
     */
    custom: (content, options = {}) => {
        return hotToast.custom(content, options);
    },

    /**
     * Promise toast
     */
    promise: (promise, msgs, options = {}) => {
        return hotToast.promise(promise, msgs, options);
    }
};

export default toast;
