import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const CART_STORAGE_KEY = 'mini-shop-cart-v1'

const categoryNameMap = {
  cool_stuff: 'Đồ công nghệ',
  relogios_presentes: 'Đồng hồ & quà tặng',
  brinquedos: 'Đồ chơi',
  bebes: 'Mẹ & bé',
  moveis_decoracao: 'Nội thất & trang trí',
  casa_conforto: 'Trang trí nhà',
  cama_mesa_banho: 'Giường, ga & phòng tắm'
}

const toNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const buildCart = (items) => {
  const normalizedItems = (items || []).map((item) => {
    const quantity = Math.max(1, toNumber(item.quantity) || 1)
    const productPrice = toNumber(item.product?.price)
    const subtotal = Number((productPrice * quantity).toFixed(2))

    return {
      id: item.id || item.product_id,
      product_id: item.product_id,
      product: item.product,
      quantity,
      subtotal
    }
  })

  const itemCount = normalizedItems.reduce((sum, item) => sum + item.quantity, 0)
  const total = Number(
    normalizedItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  )

  return {
    items: normalizedItems,
    item_count: itemCount,
    total
  }
}

const readCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) {
      return buildCart([])
    }

    const parsed = JSON.parse(raw)
    return buildCart(parsed.items || [])
  } catch (_error) {
    return buildCart([])
  }
}

const writeCart = (cart) => {
  const slim = {
    items: (cart.items || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      product: item.product,
      quantity: item.quantity
    }))
  }
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(slim))
}

const findProductById = async (productId) => {
  try {
    const detail = await api.get(`/products/${productId}`)
    return detail.data?.product || null
  } catch (_error) {
    const list = await api.get('/products')
    const allProducts = list.data?.products || []
    return allProducts.find((p) => String(p._id) === String(productId)) || null
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  getMe: () => api.get('/users/me'),
  changePassword: (data) => api.post('/users/change-password', data),
}

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
}

// Categories API (Mocked for current layout since backend has no Category service)
export const categoriesAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/products')
      const products = response.data?.products || []
      const bucket = new Map()
      const allowedCategories = ['cool_stuff', 'relogios_presentes', 'brinquedos', 'bebes', 'moveis_decoracao', 'casa_conforto', 'cama_mesa_banho']

      products.forEach((product) => {
        const key = String(product.category || '').trim()
        if (!key || !allowedCategories.includes(key)) return
        bucket.set(key, (bucket.get(key) || 0) + 1)
      })

      const categories = Array.from(bucket.entries())
        .map(([id, product_count]) => ({
          id,
          name: categoryNameMap[id] || id.replace(/_/g, ' '),
          product_count
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'))

      return { data: { data: categories } }
    } catch (_error) {
      return {
        data: {
          data: [
            { id: 'cool_stuff', name: 'Đồ công nghệ', product_count: 0 },
            { id: 'relogios_presentes', name: 'Đồng hồ & quà tặng', product_count: 0 },
            { id: 'brinquedos', name: 'Đồ chơi', product_count: 0 },
            { id: 'bebes', name: 'Mẹ & bé', product_count: 0 },
            { id: 'moveis_decoracao', name: 'Nội thất & trang trí', product_count: 0 },
            { id: 'casa_conforto', name: 'Trang trí nhà', product_count: 0 },
            { id: 'cama_mesa_banho', name: 'Giường, ga & phòng tắm', product_count: 0 }
          ]
        }
      }
    }
  },
  getById: (id) => Promise.resolve({ data: { data: {} } }),
}

// Cart API (Mocked, using local state or updating if backend requires)
export const cartAPI = {
  get: async () => {
    const cart = readCart()
    return { data: { data: cart } }
  },
  add: async (data) => {
    const productId = String(data.product_id || '')
    const quantity = Math.max(1, toNumber(data.quantity) || 1)
    if (!productId) {
      throw new Error('product_id is required')
    }

    const product = await findProductById(productId)
    if (!product) {
      throw new Error('Product not found')
    }

    const current = readCart()
    const items = [...current.items]
    const idx = items.findIndex((item) => String(item.product_id) === productId)

    if (idx >= 0) {
      items[idx] = {
        ...items[idx],
        quantity: items[idx].quantity + quantity
      }
    } else {
      items.push({
        id: productId,
        product_id: productId,
        product: {
          ...product,
          id: String(product._id || product.id || productId)
        },
        quantity
      })
    }

    const updated = buildCart(items)
    writeCart(updated)
    return { data: { data: updated, message: 'Da them vao gio hang' } }
  },
  update: async (itemId, data) => {
    const quantity = Math.max(1, toNumber(data.quantity) || 1)
    const current = readCart()
    const items = current.items.map((item) =>
      String(item.id) === String(itemId) || String(item.product_id) === String(itemId)
        ? { ...item, quantity }
        : item
    )

    const updated = buildCart(items)
    writeCart(updated)
    return { data: { data: updated } }
  },
  remove: async (itemId) => {
    const current = readCart()
    const items = current.items.filter(
      (item) => String(item.id) !== String(itemId) && String(item.product_id) !== String(itemId)
    )

    const updated = buildCart(items)
    writeCart(updated)
    return { data: { data: updated } }
  },
  clear: async () => {
    const updated = buildCart([])
    writeCart(updated)
    return { data: { data: updated } }
  },
}

// Orders API
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  getByCustomerUniqueId: (customerUniqueId, params) =>
    api.get(`/orders/customer/${customerUniqueId}/summary`, { params }),
  checkout: (data) => {
    const normalizedItems = (data.items || [])
      .map((item) => ({
        product_id: item.product_id || item.product?.id || item.product?._id || item.id,
        quantity: Number(item.quantity) || 1
      }))
      .filter((item) => item.product_id)

    return api.post('/orders', {
      user_id: data.user_id,
      items: normalizedItems,
      shipping_address: data.shipping_address,
      phone: data.phone,
      note: data.note,
      payment_method: data.payment_method
    })
  },
  cancel: (id) => Promise.resolve({}),
  confirmDelivery: (id) => Promise.resolve({}),
  adminGetAll: (params) => api.get('/orders/admin/all', { params }),
  adminUpdateStatus: (id, data) => api.put(`/orders/admin/${id}/status`, data),
}

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
}

// Chatbot API
export const chatbotAPI = {
  chat: (data) => api.post('/chatbot/chat', data),
  getSuggestions: () => api.get('/chatbot/suggestions'),
}

// Recommendations API (Ecommerce Recommendation)
export const recommendationsAPI = {
  getPersonalized: (userId) => api.get(`/recommendations/user/${userId}?mode=hybrid`),
  getSimilarProducts: (productId) => api.get(`/recommendations/product/${productId}`),
}

export default api
