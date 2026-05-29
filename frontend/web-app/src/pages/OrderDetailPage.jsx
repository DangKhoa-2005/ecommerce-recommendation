import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { ordersAPI } from '../services/api'
import { useAuthStore } from '../store'

function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isAdminShipping, setIsAdminShipping] = useState(false)
  const { user } = useAuthStore()  
  useEffect(() => {
    loadOrder()
  }, [id])
  
  const loadOrder = async () => {
    setIsLoading(true)
    try {
      const response = await ordersAPI.getById(id)
      setOrder(response.data?.order || response.data?.data?.order || response.data?.data || null)
    } catch (error) {
      toast.error('Không tìm thấy đơn hàng')
      navigate('/orders')
    } finally {
      setIsLoading(false)
    }
  }
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có dữ liệu'
    // If dateString doesn't end with Z, append it to treat as UTC
    const utcDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`
    return new Date(utcDateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    })
  }
  
  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
      return
    }
    
    setIsCancelling(true)
    try {
      await ordersAPI.cancel(id)
      toast.success('Đã hủy đơn hàng')
      loadOrder()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hủy đơn hàng')
    } finally {
      setIsCancelling(false)
    }
  }
  
  const getStatusIcon = (status) => {
    const icons = {
      confirmed: CheckCircle,
      shipping: Truck,
      delivered: Package,
      cancelled: XCircle
    }
    return icons[status] || Clock
  }
  
  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
      shipping: 'bg-purple-100 text-purple-700 border-purple-200',
      delivered: 'bg-green-100 text-green-700 border-green-200',
      cancelled: 'bg-red-100 text-red-700 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getPaymentMethodDisplay = (paymentMethod, paymentMethodDisplay) => {
    if (paymentMethodDisplay) {
      return paymentMethodDisplay
    }

    const paymentMap = {
      cod: 'COD - Khi nhận hàng',
      bank_transfer: 'Chuyển khoản ngân hàng',
      e_wallet: 'Ví điện tử (MoMo/ZaloPay)'
    }

    return paymentMap[paymentMethod] || 'COD - Khi nhận hàng'
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-8"></div>
          <div className="bg-white rounded-xl p-6 mb-6">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  if (!order) {
    return null
  }
  
  const totalAmount = Number(order.total_amount || 0)
  const freightTotal = Number(order.freight_total || 0) || Number(order.items?.[0]?.freight_value || 0)
  const netTotal = totalAmount - freightTotal

  const StatusIcon = getStatusIcon(order.status)
  
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <Link
        to={user?.role === 'admin' ? '/admin/orders' : '/orders'}
        className="inline-flex items-center text-gray-600 hover:text-primary-600 mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {user?.role === 'admin' ? 'Quay lại quản lý đơn hàng' : 'Quay lại đơn hàng'}
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Đơn hàng #{order.user_order_number || order.id}
        </h1>
        
        {user?.role !== 'admin' && (order.status === 'confirmed') && (
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isCancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
            </button>
            <span className="text-xs text-gray-500 max-w-xs text-right italic">
              Bằng cách nhấn hủy, bạn xác nhận đơn hàng này sai sót và Shop chưa giao cho đơn vị vận chuyển.
            </span>
          </div>
        )}

        {user?.role === 'admin' && order.status === 'confirmed' && (
          <button
            onClick={async () => {
              if (!window.confirm('Chuyển đơn hàng sang trạng thái Đang giao?')) return
              setIsAdminShipping(true)
              try {
                await ordersAPI.adminUpdateStatus(id, { status: 'shipping' })
                toast.success('Đã chuyển sang Đang giao')
                loadOrder()
              } catch (error) {
                toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái')
              } finally {
                setIsAdminShipping(false)
              }
            }}
            disabled={isAdminShipping}
            className="ml-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isAdminShipping ? 'Đang cập nhật...' : 'Chuyển sang Đang giao'}
          </button>
        )}

        {user?.role !== 'admin' && order.status === 'shipping' && (
          <button
            onClick={async () => {
              if (!window.confirm('Xác nhận bạn đã nhận được hàng?')) return
              setIsConfirming(true)
              try {
                await ordersAPI.confirmDelivery(id)
                toast.success('Xác nhận đã nhận hàng thành công')
                loadOrder()
              } catch (error) {
                toast.error(error.response?.data?.message || 'Không thể xác nhận')
              } finally {
                setIsConfirming(false)
              }
            }}
            disabled={isConfirming}
            className="ml-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {isConfirming ? 'Đang xác nhận...' : 'Xác nhận đã nhận'}
          </button>
        )}
      </div>
      
      {/* Status Card */}
      <div className={`rounded-xl p-6 mb-6 border-2 ${getStatusColor(order.status)}`}>
        <div className="flex items-center gap-3">
          <StatusIcon className="w-8 h-8" />
          <div>
            <p className="font-semibold text-lg">{order.status_display}</p>
          </div>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Shipping Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Thông tin giao hàng</h2>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Địa chỉ</p>
                <p className="text-gray-900">{order.shipping_address}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Số điện thoại</p>
                <p className="text-gray-900">{order.phone}</p>
              </div>
            </div>
            
            {order.note && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">Ghi chú</p>
                <p className="text-gray-900">{order.note}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Order Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Mã đơn hàng</span>
              <span className="font-medium">#{order.user_order_number || order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày đặt</span>
              <span>{formatDate(order.purchase_timestamp || order.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày giao cho vận chuyển</span>
              <span>{formatDate(order.delivered_carrier_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày nhận hàng</span>
              <span>{formatDate(order.delivered_customer_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Thanh toán</span>
              <span>{getPaymentMethodDisplay(order.payment_method, order.payment_method_display)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số lượng</span>
              <span>{order.item_count || (order.items ? order.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0)} sản phẩm</span>
            </div>


          </div>
        </div>
      </div>
      
      {/* Order Items */}
      <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
        <h2 className="font-semibold text-gray-900 mb-4">Sản phẩm</h2>
        
        <div className="space-y-4">
          {order.items?.map((item, idx) => (
            <div key={item.id || item.product_id || idx} className="flex gap-4 py-4 border-b border-gray-100 last:border-0">
              <Link
                to={`/products/${item.product_id}`}
                className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
              >
                <img
                  src={item.image_url || item.product?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.product?.name || item.product_name || 'Product')}&background=random&size=80`}
                  alt={item.product_name || 'Product'}
                  className="w-full h-full object-cover"
                />
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.product_id}`}
                  className="font-medium text-gray-900 hover:text-primary-600 line-clamp-2"
                >
                  {item.product?.name || item.product_name || 'Sản phẩm không còn tồn tại'}
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  {formatPrice(item.unit_price || item.price)} x {item.quantity}
                </p>
              </div>
              
              <p className="font-semibold text-gray-900">
                {formatPrice(item.line_total || item.subtotal)}
              </p>
            </div>
          ))}
        </div>
        
        {/* Totals */}
        <div className="border-t border-gray-100 mt-4 pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tạm tính</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between pt-3 border-t border-gray-100">
            <span className="font-semibold text-gray-900">Tổng cộng</span>
            <span className="font-bold text-xl text-primary-600">
              {formatPrice(totalAmount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderDetailPage
