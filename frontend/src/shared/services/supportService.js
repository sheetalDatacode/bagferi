import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getAuthHeader = () => {
    const token = localStorage.getItem('admin-token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const getSupportConfig = async () => {
    try {
        const response = await axios.get(`${API_URL}/support-config`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const updateSupportConfig = async (data) => {
    try {
        const response = await axios.put(`${API_URL}/support-config/admin`, data, getAuthHeader());
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};
