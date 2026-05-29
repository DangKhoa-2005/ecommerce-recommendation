import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore, useAuthStore } from '../store'

function CartPage() {
  const navigate = useNavigate()
  const { cart, fetchCart, updateQuantity, removeItem, isLoading } = useCartStore()
  
  useEffect(() => {
    fetchCart()
  }, [fetchCart])
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }
  
  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return
    
    const result = await updateQuantity(itemId, newQuantity)
    if (!result.success) {
      toast.error(result.message)
    }
  }
  
  const handleRemove = async (itemId) => {
    const result = await removeItem(itemId)
    if (result.success) {
      toast.success('Đã xóa sản phẩm')
    } else {
      toast.error(result.message)
    }
  }
  
  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      toast.error('Giỏ hàng trống')
      return
    }
    navigate('/checkout')
  }
  
  if (isLoading && !cart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl h-32"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto" />
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Giỏ hàng trống</h2>
          <p className="mt-2 text-gray-500">
            Bạn chưa có sản phẩm nào trong giỏ hàng
          </p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Tiếp tục mua sắm
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Giỏ hàng ({cart.item_count} sản phẩm)
      </h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {cart.items.map((item, index) => (
              <div
                key={item.id}
                className={`p-6 flex gap-4 ${
                  index !== cart.items.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                {/* Image */}
                <Link
                  to={`/products/${item.product_id}`}
                  className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
                >
                  <img
                    src={item.product?.image_url || 'https://via.placeholder.com/100'}
                    alt={item.product?.name}
                    className="w-full h-full object-cover"
                  />
                </Link>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${item.product_id}`}
                    className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                  >
                    {item.product?.name}
                  </Link>
                  
                  {item.product?.category && (
                    <p className="text-sm text-gray-500 mt-1">
                      {item.product.category.name}
                    </p>
                  )}
                  
                  <p className="text-primary-600 font-semibold mt-2">
                    {formatPrice(item.product?.price || 0)}
                  </p>
                </div>
                
                {/* Quantity & Actions */}
                <div className="flex flex-col items-end justify-between">
                  {/* Quantity */}
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= (item.product?.stock || 99)}
                      className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Subtotal & Remove */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatPrice(item.subtotal)}
                    </p>
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="mt-1 text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <Link
              to="/products"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Tiếp tục mua sắm
            </Link>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-4 mt-8 lg:mt-0">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Tóm tắt đơn hàng
            </h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tạm tính</span>
                <span className="text-gray-900">{formatPrice(cart.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phí vận chuyển</span>
                <span className="text-green-600">Miễn phí</span>
              </div>
            </div>
            
            <div className="border-t border-gray-100 mt-4 pt-4">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Tổng cộng</span>
                <span className="font-bold text-xl text-primary-600">
                  {formatPrice(cart.total)}
                </span>
              </div>
            </div>
            
            {/** Hide checkout CTA for admin users */}
            {(() => {
              const { user } = useAuthStore.getState()
              if (user?.role === 'admin') {
                return (
                  <div className="w-full mt-6 py-3 rounded-lg font-semibold text-center text-gray-700 border border-gray-200">
                    Tài khoản Admin không thể tiến hành thanh toán tại đây.
                  </div>
                )
              }
              return (
                <>
                  <button
                    onClick={handleCheckout}
                    className="w-full mt-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                  >
                    Tiến hành thanh toán
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="mt-4 text-xs text-gray-500 text-center">
                    Hỗ trợ COD, Chuyển khoản ngân hàng, Ví điện tử
                  </p>
                </>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage
