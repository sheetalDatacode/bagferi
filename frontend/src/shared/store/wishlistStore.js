import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useWishlistStore = create((set, get) => ({
    wishlistItems: [], // Array of product IDs that are in the wishlist
    fullWishlist: [], // Array of full product objects
    loading: false,

    fetchWishlist: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/wishlist');
            if (response.success && response.data) {
                // Extract just the product IDs for easy checking in components
                const ids = response.data.map(item => item.productId?._id || item.productId?.id || item.productId);
                set({ 
                    wishlistItems: ids,
                    fullWishlist: response.data 
                });
            }
        } catch (error) {
            console.error('Error fetching wishlist:', error);
        } finally {
            set({ loading: false });
        }
    },

    toggleWishlist: async (productId) => {
        if (!productId) return;
        
        const { wishlistItems } = get();
        const isCurrentlyInWishlist = wishlistItems.includes(productId);
        
        // Optimistic update
        if (isCurrentlyInWishlist) {
            set({ wishlistItems: wishlistItems.filter(id => id !== productId) });
        } else {
            set({ wishlistItems: [...wishlistItems, productId] });
        }

        try {
            const response = await api.post('/wishlist/toggle', { productId });
            if (response.success) {
                if (response.isAdded) {
                    toast.success('Added to wishlist');
                } else {
                    toast.success('Removed from wishlist');
                }
                // Silently refresh full wishlist in background to ensure sync
                get().fetchWishlist();
            } else {
                // Revert on failure
                toast.error(response.message || 'Failed to update wishlist');
                set({ wishlistItems }); // Revert back to original state
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            toast.error('Something went wrong');
            // Revert on failure
            set({ wishlistItems }); 
        }
    },

    clearWishlist: () => {
        set({ wishlistItems: [], fullWishlist: [] });
    }
}));
