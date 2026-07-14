import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';
import { useSubscriptionStore } from './subscriptionStore';
import { useDashboardStore } from './dashboardStore';

export const useB2BVendorAuthStore = create(
    persist(
        (set) => ({
            vendor: null,
            token: null,
            isAuthenticated: false,
            loading: false,
            error: null,

            login: async (email, password) => {
                set({ loading: true, error: null });
                try {
                    // Validate inputs
                    if (!email || !password) {
                        const error = new Error('Email and password are required');
                        set({ loading: false, error: error.message });
                        return { success: false, message: error.message };
                    }
                    const response = await api.post('/auth/vendor/login', { email, password });

                    // Handle different response structures
                    // API interceptor returns response.data, so response is already unwrapped
                    let vendor, token;

                    if (response && response.success && response.data) {
                        // Standard structure: { success: true, data: { vendor, token } }
                        vendor = response.data.vendor;
                        token = response.data.token;
                    } else if (response && response.vendor && response.token) {
                        // Direct structure: { vendor, token }
                        vendor = response.vendor;
                        token = response.token;
                    } else {
                        const errorMessage = response?.message || 'Login failed - invalid response structure';
                        set({ loading: false, error: errorMessage });
                        return { success: false, message: errorMessage };
                    }

                    // Validate vendor exists
                    if (!vendor) {
                        const errorMessage = 'Login failed - vendor data not received';
                        set({ loading: false, error: errorMessage });
                        return { success: false, message: errorMessage };
                    }

                    // Validate vendor type for B2B login (check for exact match, handle string comparison)
                    const vendorType = String(vendor.vendorType || '').toLowerCase().trim();
                    if (vendorType !== 'b2b') {
                        const error = new Error('This account is not a B2B vendor account. Please contact support if you believe this is an error.');
                        set({ loading: false, error: error.message });
                        return { success: false, message: error.message };
                    }

                    // Transform backend vendor object to frontend format
                    const vendorData = {
                        id: vendor._id || vendor.id,
                        _id: vendor._id,
                        name: vendor.name,
                        email: vendor.email,
                        phone: vendor.phone || '',
                        storeName: vendor.storeName,
                        storeDescription: vendor.storeDescription || '',
                        role: vendor.role || 'vendor',
                        vendorType: vendor.vendorType || 'b2b',
                        businessTypes: vendor.businessTypes || [],
                        gstNumber: vendor.gstNumber || '',
                        mfgOfWork: vendor.mfgOfWork || '',
                        address: vendor.address || {},
                        status: vendor.status,
                        isActive: vendor.isActive || false,
                        isEmailVerified: vendor.isEmailVerified || false,
                        currentSubscription: vendor.currentSubscription || null,
                        businessType: vendor.businessType || 'Textile',
                        businessTypeRef: vendor.businessTypeRef || null,
                    };

                    if (!token) {
                        const errorMessage = 'Login failed - no authentication token received';
                        set({ loading: false, error: errorMessage });
                        return { success: false, message: errorMessage };
                    }

                    // Set token in localStorage FIRST (before Zustand state update)
                    localStorage.setItem('b2b-vendor-token', token);
                    // Store login timestamp to prevent immediate redirects
                    sessionStorage.setItem('b2b-vendor-login-timestamp', Date.now().toString());

                    // Update Zustand state - this will trigger persist middleware
                    set({
                        vendor: vendorData,
                        token,
                        isAuthenticated: true,
                        loading: false,
                        error: null
                    });

                    // Clear any stale state from previous sessions
                    useSubscriptionStore.getState().clearStatus();
                    useDashboardStore.getState().clearDashboard();

                    return { success: true };
                } catch (error) {
                    let errorMessage = 'Login failed. Please check your credentials.';

                    if (error.response?.status === 401) {
                        errorMessage = 'Invalid email or password';
                    } else if (error.response?.status === 403) {
                        errorMessage = error.response?.data?.message || 'Account is not approved or inactive. Please contact support.';
                    } else if (error.response?.data?.code === 'PHONE_NOT_VERIFIED') {
                        // Don't show generic error for phone not verified - let the login page handle it
                        errorMessage = 'Phone not verified';
                    } else if (error.response?.data?.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.message) {
                        errorMessage = error.message;
                    }

                    set({ loading: false, error: errorMessage });
                    return { 
                        success: false, 
                        message: errorMessage,
                        code: error.response?.data?.code,
                        data: error.response?.data?.data,
                        expiredDate: error.response?.data?.expiredDate
                    };
                }
            },

            setAuth: (vendor, token) => set({
                vendor,
                token,
                isAuthenticated: !!token,
                error: null
            }),

            logout: () => {
                localStorage.removeItem('b2b-vendor-token');
                sessionStorage.removeItem('b2b-vendor-login-timestamp');
                
                // Clear all vendor related stores
                useSubscriptionStore.getState().clearStatus();
                useDashboardStore.getState().clearDashboard();

                set({
                    vendor: null,
                    token: null,
                    isAuthenticated: false,
                    error: null
                });
            },

            setError: (error) => set({ error }),
            setLoading: (loading) => set({ loading }),

            // Update vendor profile
            updateProfile: async (profileData) => {
                set({ loading: true, error: null });
                try {
                    const response = await api.put('/auth/vendor/profile', profileData);

                    if (response.success && response.data) {
                        const vendor = response.data.vendor;

                        // Transform backend vendor object to frontend format
                        const updatedVendor = {
                            id: vendor._id || vendor.id,
                            _id: vendor._id,
                            name: vendor.name,
                            email: vendor.email,
                            phone: vendor.phone || '',
                            storeName: vendor.storeName,
                            storeDescription: vendor.storeDescription || '',
                            role: vendor.role || 'vendor',
                            vendorType: vendor.vendorType || 'b2b',
                            businessTypes: vendor.businessTypes || [],
                            gstNumber: vendor.gstNumber || '',
                            mfgOfWork: vendor.mfgOfWork || '',
                            address: vendor.address || {},
                            status: vendor.status,
                            isActive: vendor.isActive || false,
                            isEmailVerified: vendor.isEmailVerified || false,
                            currentSubscription: vendor.currentSubscription || null,
                            businessType: vendor.businessType || 'Textile',
                            businessTypeRef: vendor.businessTypeRef || null,
                        };

                        set({
                            vendor: updatedVendor,
                            loading: false,
                            error: null
                        });

                        return { success: true, vendor: updatedVendor };
                    } else {
                        throw new Error(response.message || 'Profile update failed');
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
                    set({ loading: false, error: errorMessage });
                    throw error;
                }
            },

            // Verify vendor email
            verifyEmail: async (email, otp) => {
                set({ loading: true, error: null });
                try {
                    const response = await api.post('/auth/vendor/verify-email', { email, otp });
                    if (response.success && response.data) {
                        set({ loading: false, error: null });
                        return { success: true, message: response.message };
                    } else {
                        throw new Error(response.message || 'Email verification failed');
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message || 'Verification failed';
                    set({ loading: false, error: errorMessage });
                    return { success: false, message: errorMessage };
                }
            },

            // Resend OTP
            resendOTP: async (email) => {
                set({ loading: true, error: null });
                try {
                    const response = await api.post('/auth/vendor/resend-otp', { email });
                    if (response.success) {
                        set({ loading: false });
                        return { success: true, message: response.message };
                    } else {
                        throw new Error(response.message || 'Failed to resend OTP');
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to resend OTP';
                    set({ loading: false, error: errorMessage });
                    return { success: false, message: errorMessage };
                }
            },

            // Forgot password
            forgotPassword: async (email) => {
                set({ loading: true, error: null });
                try {
                    const response = await api.post('/auth/vendor/forgot-password', { email });
                    if (response.success) {
                        set({ loading: false });
                        return { success: true, message: response.message };
                    } else {
                        throw new Error(response.message || 'Failed to send password reset OTP');
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message || 'Failed to send OTP';
                    set({ loading: false, error: errorMessage });
                    return { success: false, message: errorMessage };
                }
            },

            // Reset password with OTP
            resetPassword: async (email, otp, newPassword) => {
                set({ loading: true, error: null });
                try {
                    const response = await api.post('/auth/vendor/reset-password', {
                        email,
                        otp,
                        newPassword
                    });
                    if (response.success) {
                        set({ loading: false });
                        return { success: true, message: response.message };
                    } else {
                        throw new Error(response.message || 'Password reset failed');
                    }
                } catch (error) {
                    const errorMessage = error.response?.data?.message || error.message || 'Password reset failed';
                    set({ loading: false, error: errorMessage });
                    return { success: false, message: errorMessage };
                }
            },
        }),
        {
            name: 'b2b-vendor-auth-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
