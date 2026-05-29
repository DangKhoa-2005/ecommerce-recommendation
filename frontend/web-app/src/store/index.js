import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI, cartAPI } from '../services/api'

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      
      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await authAPI.login({ email, password })
          const user = response.data?.user || response.data?.data?.user
          const accessToken = response.data?.token || response.data?.data?.access_token

          if (!user || !accessToken) {
            throw new Error('Auth response format is invalid')
          }
          
          localStorage.setItem('access_token', accessToken)
          set({ user, isAuthenticated: true, isLoading: false })
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            message: error.response?.data?.message || 'Đăng nhập thất bại' 
          }
        }
      },
      
      register: async (data) => {
        set({ isLoading: true })
        try {
          const payload = {
            email: data.email,
            password: data.password,
            fullName: data.fullName || data.full_name
          }
          const response = await authAPI.register(payload)
          const user = response.data?.user || response.data?.data?.user
          const accessToken = response.data?.token || response.data?.data?.access_token
          
          if (user && accessToken) {
            localStorage.setItem('access_token', accessToken)
            set({ user, isAuthenticated: true, isLoading: false })
          } else {
            set({ isLoading: false })
          }
          
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          return { 
            success: false, 
            message: error.response?.data?.message || 'Đăng ký thất bại' 
          }
        }
      },
      
      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, isAuthenticated: false })
        // Also clear cart
        useCartStore.getState().clearLocalCart()
      },
      
      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } })
      },
      
      checkAuth: async () => {
        const token = localStorage.getItem('access_token')
        if (!token) {
          set({ isAuthenticated: false, user: null })
          return
        }
        
        try {
          const response = await authAPI.getMe()
          const user = response.data?.user || response.data?.data
          set({ user, isAuthenticated: true })
        } catch (error) {
          localStorage.removeItem('access_token')
          set({ isAuthenticated: false, user: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)

// Cart Store
export const useCartStore = create(
  (set, get) => ({
    cart: null,
    isLoading: false,
    
    fetchCart: async () => {
      set({ isLoading: true })
      try {
        const response = await cartAPI.get()
        set({ cart: response.data.data, isLoading: false })
      } catch (error) {
        set({ isLoading: false })
        console.error('Failed to fetch cart:', error)
      }
    },
    
    addToCart: async (productId, quantity = 1) => {
      set({ isLoading: true })
      try {
        const response = await cartAPI.add({ product_id: productId, quantity })
        set({ cart: response.data.data, isLoading: false })
        return { success: true, message: response.data.message }
      } catch (error) {
        set({ isLoading: false })
        return { 
          success: false, 
          message: error.response?.data?.message || error.message || 'Thêm vào giỏ thất bại' 
        }
      }
    },
    
    updateQuantity: async (itemId, quantity) => {
      set({ isLoading: true })
      try {
        const response = await cartAPI.update(itemId, { quantity })
        set({ cart: response.data.data, isLoading: false })
        return { success: true }
      } catch (error) {
        set({ isLoading: false })
        return { 
          success: false, 
          message: error.response?.data?.message || error.message || 'Cập nhật thất bại' 
        }
      }
    },
    
    removeItem: async (itemId) => {
      set({ isLoading: true })
      try {
        const response = await cartAPI.remove(itemId)
        set({ cart: response.data.data, isLoading: false })
        return { success: true }
      } catch (error) {
        set({ isLoading: false })
        return { 
          success: false, 
          message: error.response?.data?.message || error.message || 'Xóa thất bại' 
        }
      }
    },
    
    clearCart: async () => {
      set({ isLoading: true })
      try {
        const response = await cartAPI.clear()
        set({ cart: response.data.data, isLoading: false })
        return { success: true }
      } catch (error) {
        set({ isLoading: false })
        return { success: false }
      }
    },
    
    clearLocalCart: () => {
      set({ cart: null })
    },
    
    getItemCount: () => {
      const { cart } = get()
      return cart?.item_count || 0
    },
  })
)
