import { useEffect } from 'react';

/**
 * Hook to persist form state to localStorage
 * @param {string} key - Unique key for localStorage
 * @param {Object} formData - Current form state
 * @param {Function} setFormData - Function to update form state
 * @param {boolean} enabled - Whether to enable persistence
 */
export const useFormPersist = (key, formData, setFormData, enabled = true) => {
    // Load data from localStorage on mount
    useEffect(() => {
        if (!enabled) return;
        
        const savedData = localStorage.getItem(`form_persist_${key}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Merge with current state to ensure default values exist
                setFormData(prev => ({ ...prev, ...parsed }));
            } catch (error) {
                console.error(`Failed to parse persisted form data for ${key}:`, error);
            }
        }
    }, [key, enabled, setFormData]);

    // Save data to localStorage whenever formData changes
    useEffect(() => {
        if (!enabled || !formData) return;
        
        // Don't save empty/initial state if possible, but for simplicity we save everything
        // We might want to filter out sensitive info or large files if they were base64
        localStorage.setItem(`form_persist_${key}`, JSON.stringify(formData));
    }, [key, formData, enabled]);

    // Function to clear persisted data
    const clearPersist = () => {
        localStorage.removeItem(`form_persist_${key}`);
    };

    return { clearPersist };
};
