import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore, useCartStore } from '../store'
import { useNavigate } from 'react-router-dom'

function ProductCard({ product }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { addToCart, isLoading } = useCartStore()
  
  const formatPrice = (price) => {
    const amount = Number(price)
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Number.isFinite(amount) ? amount : 0)
  }

  const productName = product?.name || 'San pham'
  const productId = product?.id || product?._id
  const productImage = product?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(productName)}&background=random&size=400`
  
  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!productId) {
      toast.error('San pham khong hop le')
      return
    }
    
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ hàng')
      navigate('/login')
      return;
    }
    
    const result = await addToCart(productId, 1)
    if (result.success) {
      toast.success(result.message || 'Đã thêm vào giỏ hàng')
    } else {
      toast.error(result.message)
    }
  }
  
  return (
    <Link
      to={`/products/${productId}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col h-full"
    >
      {/* Target Image Size: Square */}
      <div className="aspect-square w-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
        {/* Changed logic here to support direct image_url parsing or UI Avatars fallback */}
        <img
          src={productImage}
          alt={productName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(productName)}&background=random&size=400`
          }}
        />
      </div>
      
      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        {/* Category */}
        {product.category && (
          <span className="text-xs text-primary-600 font-medium lowercase">
            {product.category.name || product.category}
          </span>
        )}
        
        {/* Name */}
        <h3 className="font-medium text-gray-900 mt-1 line-clamp-2 min-h-[48px]">
          {productName}
        </h3>
        
        {/* Recommendation Reason */}
        {product.recommendation_type && (
          <p className="text-xs text-gray-500 italic mt-1">
            {product.recommendation_type === 'collaborative_filtering' 
              ? '💡 Dựa trên sở thích của bạn'
              : product.recommendation_type === 'association_rules'
              ? '🛒 Thường được mua cùng các món bạn đã xem'
              : 'Được gợi ý cho bạn'}
          </p>
        )}
        
        {/* Price & Stock */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-primary-600">
            {formatPrice(product.price)}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            product.stock > 0 || product.in_stock !== false
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {product.stock > 0 || product.in_stock !== false ? 'Còn hàng' : 'Hết hàng'}
          </span>
        </div>
        
        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={(product.stock <= 0 && product.in_stock === false) || isLoading}
          className={`mt-4 w-full flex-shrink-0 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            product.stock > 0 || product.in_stock !== false
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          {product.stock > 0 || product.in_stock !== false ? 'Thêm vào giỏ' : 'Hết hàng'}
        </button>
      </div>
    </Link>
  )
}

export default ProductCard;
