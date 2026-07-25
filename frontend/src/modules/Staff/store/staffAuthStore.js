import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStaffAuthStore = create(
    persist(
        (set) => ({
            staff: null,
            token: null,
            isAuthenticated: false,

            login: (staff, token) => {
                localStorage.setItem('staffToken', token);
                set({ staff, token, isAuthenticated: true });
            },

            logout: () => {
                localStorage.removeItem('staffToken');
                set({ staff: null, token: null, isAuthenticated: false });
            },
        }),
        {
            name: 'staff-auth-storage',
        }
    )
);
