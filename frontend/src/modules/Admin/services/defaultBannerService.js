import api from '../../../shared/utils/api';

/**
 * Get all default banners
 */
export const getDefaultBanners = async () => {
    const response = await api.get('/admin/default-banners');
    return response;
};

/**
 * Create a new default banner
 */
export const createDefaultBanner = async (formData) => {
    const response = await api.post('/admin/default-banners', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response;
};

/**
 * Delete a default banner
 */
export const deleteDefaultBanner = async (id) => {
    const response = await api.delete(`/admin/default-banners/${id}`);
    return response;
};
