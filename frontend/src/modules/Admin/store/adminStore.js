import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '../../../shared/utils/api';

export const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Admin login action
      login: async (email, password, secretCode, rememberMe = false) => {
        set({ isLoading: true });
        try {
          // Trim email and password to remove any whitespace
          const trimmedEmail = email?.trim();
          const trimmedPassword = password?.trim();
          const trimmedSecretCode = secretCode?.trim();

          if (!trimmedEmail || !trimmedPassword || !trimmedSecretCode) {
            throw new Error('Email, password and secret code are required');
          }

          const response = await api.post('/auth/admin/login', {
            email: trimmedEmail,
            password: trimmedPassword,
            secretCode: trimmedSecretCode
          });

          if (response.success && response.data) {
            const { admin, token } = response.data;

            // Transform backend admin object to frontend format
            const adminData = {
              id: admin._id || admin.id,
              _id: admin._id,
              name: admin.name,
              email: admin.email,
              role: admin.role || 'admin',
              avatar: admin.avatar || null,
            };

            set({
              admin: adminData,
              token: token,
              isAuthenticated: true,
              isLoading: false,
            });

            localStorage.setItem('admin-token', token);

            return { success: true, admin: adminData };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          set({ isLoading: false });

          // Extract error message properly
          // The API interceptor returns error.response.data, so check multiple places
          let errorMessage = error?.message;

          // Check if error has response data (from axios)
          if (!errorMessage && error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }

          // Check if error.response.data is the message itself (from API interceptor)
          if (!errorMessage && typeof error?.response?.data === 'string') {
            errorMessage = error.response.data;
          }

          // Fallback message
          if (!errorMessage) {
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
          }

          throw new Error(errorMessage);
        }
      },

      // Admin logout action
      logout: async () => {
        try {
          // Call backend logout endpoint if token exists and is valid
          const token = get().token;
          if (token) {
            try {
              // Check if token is expired before making API call
              const tokenParts = token.split('.');
              if (tokenParts.length === 3) {
                try {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  const exp = payload.exp;
                  const now = Math.floor(Date.now() / 1000);

                  // Only call logout API if token is not expired
                  if (exp && exp > now) {
                    await api.post('/auth/admin/logout');
                  }
                } catch (e) {
                  // Token parsing failed, skip API call
                }
              }
            } catch (error) {
              // Silently ignore logout API errors (token might be expired)
              // Still proceed with local logout
            }
          }
        } catch (error) {
          // Ignore errors, proceed with local logout
        } finally {
          set({
            admin: null,
            token: null,
            isAuthenticated: false,
          });
          localStorage.removeItem('admin-token');
        }
      },

      // Initialize admin auth state from localStorage and validate token
      initialize: async () => {
        const token = localStorage.getItem('admin-token');
        if (token) {
          // First check if token is expired locally before making API call
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const exp = payload.exp;
              const now = Math.floor(Date.now() / 1000);

              // If token is expired, clear storage immediately
              if (exp && exp <= now) {
                set({
                  admin: null,
                  token: null,
                  isAuthenticated: false,
                  isLoading: false,
                });
                localStorage.removeItem('admin-token');
                return false;
              }
            }
          } catch (e) {
            // Token parsing failed, might be invalid format
            // Continue to API validation
          }

          try {
            // Validate token with backend
            const response = await api.get('/auth/admin/me');

            if (response.success && response.data) {
              const admin = response.data.admin;

              // Transform backend admin object to frontend format
              const adminData = {
                id: admin._id || admin.id,
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role || 'admin',
                avatar: admin.avatar || null,
              };

              set({
                admin: adminData,
                token: token,
                isAuthenticated: true,
                isLoading: false,
              });

              return true;
            } else {
              // Invalid token, clear storage without calling logout to avoid redirect loops
              set({
                admin: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
              });
              localStorage.removeItem('admin-token');
              return false;
            }
          } catch (error) {
            // Token invalid or expired, clear storage silently
            // Don't call logout here as it might cause redirect loops
            set({
              admin: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
            localStorage.removeItem('admin-token');
            return false;
          }
        }
        return false;
      },
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

