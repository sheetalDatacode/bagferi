import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../utils/api';
import { registerFCMToken } from '../../services/pushNotificationService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      userType: 'b2b',
      isHydrated: false,

      // Register action
      register: async (name, email, password, phone, userType = 'b2b', businessInfo = null, referralCode = '', agreedToTerms = false) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/register', {
            name,
            email: (email && typeof email === 'string' && email.trim()) ? email.trim() : undefined,
            password,
            phone,
            userType,
            businessInfo,
            referralCode,
            agreedToTerms
          });

          if (response.success) {
            set({ isLoading: false });
            return { 
              success: true, 
              message: response.message,
              ...(response.data || {})
            };
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          throw new Error(errorMessage || 'Registration failed');
        }
      },

      // Update Profile action
      updateProfile: async (updateData) => {
        set({ isLoading: true });
        try {
          const response = await api.put('/auth/user/profile', updateData);
          if (response.success && response.data) {
            const { user } = response.data;
            const userData = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };
            set({ user: userData, isLoading: false });
            return { success: true, user: userData };
          } else {
            throw new Error(response.message || 'Profile update failed');
          }
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          throw new Error(errorMessage || 'Profile update failed');
        }
      },

      login: async (identifier, password, rememberMe = false, userType = 'b2b') => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/login', {
            identifier,
            password,
            userType
          });

          if (response.success && response.data) {
            const { user, token } = response.data;

            const userData = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };

            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              userType: user.currentMarketplace || 'b2b',
              isHydrated: true
            });

            localStorage.setItem('token', token);
            try { await registerFCMToken(true); } catch (e) { }

            return { success: true, user: userData };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });
          
          const responseData = error?.response?.data;
          let errorMessage = responseData?.message || error?.message;
          
          if (!errorMessage) {
            errorMessage = 'Invalid email/phone or password. Please check your credentials and try again.';
          }
          
          const finalError = new Error(errorMessage);
          if (responseData?.code) finalError.code = responseData.code;
          if (responseData?.data) finalError.data = responseData.data;
          
          throw finalError;
        }
      },

      // Verify Email action
      verifyEmail: async (email, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/verify-email', { email, otp });
          if (response.success && response.data) {
            const { user, token } = response.data;
            const userData = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };

            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              userType: user.currentMarketplace || 'b2b',
              isHydrated: true
            });

            localStorage.setItem('token', token);
            return { success: true, user: userData };
          } else {
            throw new Error(response.message || 'Verification failed');
          }
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          throw new Error(errorMessage || 'Verification failed');
        }
      },

      // Resend OTP action
      resendOTP: async (email) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/resend-otp', { email });
          set({ isLoading: false });
          return { success: true, message: response.message };
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          throw new Error(errorMessage || 'Failed to resend OTP');
        }
      },

      // Forgot Password action
      forgotPassword: async (email) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/forgot-password', { email });
          set({ isLoading: false });
          return { success: true, message: response.message };
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          throw new Error(errorMessage || 'Failed to process request');
        }
      },

      // Reset Password action
      resetPassword: async (email, otp, newPassword) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/user/reset-password', { email, otp, newPassword });
          set({ isLoading: false });
          return { success: true, message: response.message };
        } catch (error) {
          set({ isLoading: false });
          let errorMessage = error?.message;
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }
          throw new Error(errorMessage || 'Failed to reset password');
        }
      },

      // Send Mobile OTP
      sendOTP: async (phoneNumber) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/send-otp', { phoneNumber });
          set({ isLoading: false });
          return { success: true, message: response.message };
        } catch (error) {
          set({ isLoading: false });
          throw new Error(error?.response?.data?.message || 'Failed to send OTP');
        }
      },

      // Verify Mobile OTP
      verifyOTP: async (phoneNumber, otp) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/verify-otp', { phoneNumber, otp });
          if (response.success && response.data) {
            const { user, token } = response.data;
            const userData = {
              id: user._id || user.id,
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              avatar: user.avatar || null,
              isEmailVerified: user.isEmailVerified || false,
              role: user.role || 'user',
              currentMarketplace: user.currentMarketplace || 'b2b',
              businessInfo: user.businessInfo || null,
            };

            set({
              user: userData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
              userType: user.currentMarketplace || 'b2b',
              isHydrated: true
            });

            localStorage.setItem('token', token);
            try { await registerFCMToken(true); } catch (e) { }
            return { success: true, user: userData, isNewUser: false };
          } else if (response.success && response.isNewUser) {
            set({ isLoading: false });
            return { success: true, isNewUser: true, phoneNumber: response.phoneNumber };
          } else {
            throw new Error(response.message || 'Verification failed');
          }
        } catch (error) {
          set({ isLoading: false });
          throw new Error(error?.response?.data?.message || 'Verification failed');
        }
      },

      // Logout action
      logout: async () => {
        try {
          const token = get().token;
          if (token) {
            try {
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                if (payload.exp > Math.floor(Date.now() / 1000)) {
                  await api.post('/auth/user/logout');
                }
              }
            } catch (e) { }
          }
        } catch (error) {
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            userType: 'b2b',
            isHydrated: true
          });
          localStorage.removeItem('token');
          localStorage.removeItem('auth-storage');
        }
      },

      // Initialize
      initialize: async () => {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              if (payload.exp <= Math.floor(Date.now() / 1000)) {
                get().logout();
                return;
              }
            }
          } catch (e) { }

          try {
            const response = await api.get('/auth/user/me', { silent: true });
            if (response.success && response.data) {
              const { user } = response.data;
              const userData = {
                id: user._id || user.id,
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone || '',
                avatar: user.avatar || null,
                isEmailVerified: user.isEmailVerified || false,
                role: user.role || 'user',
                currentMarketplace: user.currentMarketplace || 'b2b',
                businessInfo: user.businessInfo || null,
              };
              set({
                user: userData,
                token: token,
                isAuthenticated: true,
                userType: userData.currentMarketplace || 'b2b',
                isHydrated: true
              });
            } else {
              get().logout();
            }
          } catch (error) {
            get().logout();
          }
        } else {
          set({ isHydrated: true });
        }
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        userType: state.userType,
      }),
    }
  )
);
