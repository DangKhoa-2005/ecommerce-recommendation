import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, Phone, FileText, ArrowLeft, CheckCircle, Landmark, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore, useAuthStore } from '../store'
import { ordersAPI } from '../services/api'

function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, fetchCart, clearLocalCart } = useCartStore()
  const { user } = useAuthStore()
  
  // Admin users cannot perform checkout through the customer checkout flow
  if (user?.role === 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Thanh toán</h1>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-700">Tài khoản Admin không thể thực hiện thanh toán như khách hàng.</p>
          <p className="text-sm text-gray-500 mt-2">Nếu bạn cần tạo đơn cho khách, hãy sử dụng chức năng tạo đơn cho khách (Admin).</p>
        </div>
      </div>
    )
  }

  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    shipping_address: user?.address || '',
    phone: user?.phone || '',
    note: '',
    payment_method: 'cod'
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  useEffect(() => {
    fetchCart()
  }, [fetchCart])
  
  useEffect(() => {
    if (cart && cart.items.length === 0) {
      navigate('/cart')
    }
  }, [cart, navigate])
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }
  
  const validate = () => {
    const newErrors = {}
    
    // Name is required (either logged-in user's name or provided in form)
    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'Tên người nhận là bắt buộc'
    }

    if (!formData.shipping_address.trim()) {
      newErrors.shipping_address = 'Địa chỉ giao hàng là bắt buộc'
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Số điện thoại là bắt buộc'
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ'
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'Vui lòng chọn phương thức thanh toán'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const paymentMethods = [
    {
      value: 'cod',
      label: 'Thanh toán khi nhận hàng (COD)',
      description: 'Thanh toán bằng tiền mặt khi nhận hàng',
      icon: CheckCircle
    },
    {
      value: 'bank_transfer',
      label: 'Chuyển khoản ngân hàng',
      description: 'Chuyển khoản trước khi giao hàng',
      icon: Landmark
    },
    {
      value: 'e_wallet',
      label: 'Ví điện tử (MoMo/ZaloPay)',
      description: 'Thanh toán online qua ví điện tử',
      icon: Wallet
    }
  ]
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setIsSubmitting(true)
    
    try {
      const response = await ordersAPI.checkout({
        ...formData,
        user_id: user?.id,
        items: cart.items || []
      })

      const order = response.data?.order || response.data?.data || null
      if (order?.id) {
        clearLocalCart()
        toast.success('Đặt hàng thành công!')
        navigate(`/orders/${order.id}`)
      } else {
        toast.success('Đặt hàng thành công!')
        navigate('/orders')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đặt hàng thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  if (!cart) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl h-96"></div>
            <div className="bg-white p-6 rounded-xl h-96"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <Link
        to="/cart"
        className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Quay lại giỏ hàng
      </Link>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Thanh toán</h1>
      
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Checkout Form */}
        <div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Thông tin giao hàng
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Người nhận
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tên người nhận"
                  // Cho phép sửa tên người nhận kể cả khi đã đăng nhập
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
                {user && (
                  <p className="mt-1 text-sm text-gray-500">Tên được lấy từ tài khoản</p>
                )}
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              {/* Address */}
              <div>
                <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Địa chỉ giao hàng *
                </label>
                <div className="relative">
                  <textarea
                    id="shipping_address"
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
                      errors.shipping_address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                </div>
                {errors.shipping_address && (
                  <p className="mt-1 text-sm text-red-500">{errors.shipping_address}</p>
                )}
              </div>
              
              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Số điện thoại *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0901234567"
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>
              
              {/* Note */}
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Ghi chú (tuỳ chọn)
                </label>
                <div className="relative">
                  <textarea
                    id="note"
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Ghi chú cho đơn hàng..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                </div>
              </div>
              
              {/* Payment method */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-medium text-gray-900 mb-3">Phương thức thanh toán</h3>
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    const isSelected = formData.payment_method === method.value

                    return (
                      <label key={method.value} className="block cursor-pointer">
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.value}
                          checked={isSelected}
                          onChange={handleChange}
                          className="sr-only"
                        />

                        <div className={`flex items-center justify-between gap-3 p-4 border-2 rounded-lg transition-colors ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="flex items-center gap-3">
                            <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                            <div>
                              <p className="font-medium text-gray-900">{method.label}</p>
                              <p className="text-sm text-gray-500">{method.description}</p>
                            </div>
                          </div>

                          {isSelected && <CheckCircle className="w-5 h-5 text-primary-600" />}
                        </div>
                      </label>
                    )
                  })}
                </div>
                {errors.payment_method && (
                  <p className="mt-1 text-sm text-red-500">{errors.payment_method}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
              </button>
            </form>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="mt-8 lg:mt-0">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Đơn hàng của bạn
            </h2>
            
            {/* Items */}
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={item.product?.image_url || 'https://via.placeholder.com/64'}
                      alt={item.product?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">
                      {item.product?.name}
                    </p>
                    <p className="text-sm text-gray-500">x{item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatPrice(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-3 text-sm">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
