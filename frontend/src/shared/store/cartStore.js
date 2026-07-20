import { create } from 'zustand';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const useCartStore = create((set, get) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/cart');
      if (response.success) {
        set({ cart: response.data });
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  addToCart: async (productId, quantity = 1) => {
    set({ loading: true });
    try {
      const response = await api.post('/cart/add', { productId, quantity });
      if (response.success) {
        set({ cart: response.data });
        toast.success('Added to Cart!');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      set({ loading: false });
    }
  },

  updateQuantity: async (productId, quantity) => {
    set({ loading: true });
    try {
      const response = await api.put('/cart/update', { productId, quantity });
      if (response.success) {
        set({ cart: response.data });
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
      toast.error('Failed to update quantity');
    } finally {
      set({ loading: false });
    }
  },

  removeFromCart: async (productId) => {
    set({ loading: true });
    try {
      const response = await api.delete(`/cart/remove/${productId}`);
      if (response.success) {
        set({ cart: response.data });
        toast.success('Item removed from cart');
      }
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      toast.error('Failed to remove item');
    } finally {
      set({ loading: false });
    }
  },

  clearCart: async () => {
    set({ loading: true });
    try {
      const response = await api.delete('/cart/clear');
      if (response.success) {
        set({ cart: { items: [] } });
      }
    } catch (error) {
      console.error('Failed to clear cart:', error);
    } finally {
      set({ loading: false });
    }
  }
}));
