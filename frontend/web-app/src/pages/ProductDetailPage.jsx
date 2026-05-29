import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Minus, Plus, ArrowLeft, Package, Shield, Truck, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { productsAPI, recommendationsAPI } from '../services/api'
import { useAuthStore, useCartStore } from '../store'
import ProductCard from '../components/ProductCard'

function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [product, setProduct] = useState(null)
  const [similarProducts, setSimilarProducts] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)
  
  const { isAuthenticated } = useAuthStore()
  const { addToCart, isLoading: cartLoading } = useCartStore()
  
  useEffect(() => {
    loadProduct()
    loadSimilarProducts()
  }, [id])
  
  const loadProduct = async () => {
    setIsLoading(true)
    try {
      const response = await productsAPI.getById(id)
      setProduct(response.data?.product || response.data?.data || null)
    } catch (error) {
      toast.error('Không tìm thấy sản phẩm')
      navigate('/products')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSimilarProducts = async () => {
    setIsLoadingSimilar(true)
    try {
      const response = await recommendationsAPI.getSimilarProducts(id)
      // Assuming response.data.data contains an array of recommended products
      setSimilarProducts(response.data.data || [])
    } catch (error) {
      console.error('Không tìm thấy sản phẩm tương tự:', error)
    } finally {
      setIsLoadingSimilar(false)
    }
  }
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }
  
  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity)
    }
  }
  
  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng')
      navigate('/login')
      return
    }
    
    const result = await addToCart(product.id || product._id, quantity)
    if (result.success) {
      toast.success(result.message || 'Đã thêm vào giỏ hàng')
    } else {
      toast.error(result.message)
    }
  }
  
  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để mua hàng')
      navigate('/login')
      return
    }
    
    const result = await addToCart(product.id || product._id, quantity)
    if (result.success) {
      navigate('/cart')
    } else {
      toast.error(result.message)
    }
  }
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-8"></div>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="aspect-square bg-gray-200 rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded w-1/3"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!product) {
    return null
  }

  const isAvailable = product.in_stock !== false && Number(product.stock || 0) > 0
  const categoryLabel = typeof product.category === 'string' ? product.category : product.category?.name
  const categoryQuery = typeof product.category === 'string' ? product.category : product.category?.id
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <Link
          to="/products"
          className="inline-flex items-center text-gray-600 hover:text-primary-600"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại sản phẩm
        </Link>
      </nav>
      
      <div className="grid md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
            <img
              src={product.image_url || 'https://via.placeholder.com/600x600?text=No+Image'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        
        {/* Product Info */}
        <div>
          {/* Category */}
          {categoryLabel && (
            <Link
              to={`/products?category_id=${categoryQuery || ''}`}
              className="inline-block text-sm text-primary-600 font-medium mb-2 hover:underline"
            >
              {categoryLabel}
            </Link>
          )}
          
          {/* Name */}
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          
          {/* Stock status */}
          <div className="mt-4">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              isAvailable 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isAvailable ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}
            </span>
          </div>
          
          {/* Price */}
          <div className="mt-6">
            <span className="text-4xl font-bold text-primary-600">
              {formatPrice(product.price)}
            </span>
          </div>
          
          {/* Description */}
          {product.description && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Mô tả sản phẩm</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}
          
          {/* Quantity selector */}
          {isAvailable && (
            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-3">Số lượng</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                    className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <span className="text-gray-500 text-sm">
                  Tối đa: {product.stock}
                </span>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAddToCart}
              disabled={!isAvailable || cartLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-5 h-5" />
              Thêm vào giỏ
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!isAvailable || cartLoading}
              className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mua ngay
            </button>
          </div>
          
          {/* Features */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6 text-primary-600" />
                </div>
                <p className="mt-2 text-sm text-gray-600">Giao hàng nhanh</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <p className="mt-2 text-sm text-gray-600">Bảo hành chính hãng</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <Package className="w-6 h-6 text-orange-600" />
                </div>
                <p className="mt-2 text-sm text-gray-600">Đổi trả 7 ngày</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products (Recommendations) */}
      <div className="mt-16 bg-blue-50/50 p-6 sm:p-8 rounded-2xl">
        <div className="flex items-center space-x-2 mb-8">
          <Sparkles className="w-6 h-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm tương tự bạn có thể thích</h2>
        </div>
        
        {isLoadingSimilar ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg"></div>
                <div className="h-4 bg-gray-200 rounded mt-4"></div>
                <div className="h-4 bg-gray-200 rounded mt-2 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : similarProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.slice(0, 4).map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">Chưa có gợi ý phù hợp cho sản phẩm này.</p>
        )}
      </div>
    </div>
  )
}

export default ProductDetailPage
