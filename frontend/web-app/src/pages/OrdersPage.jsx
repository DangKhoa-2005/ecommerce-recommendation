import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronRight, Wallet, Receipt } from 'lucide-react'
import { ordersAPI } from '../services/api'
import { useAuthStore } from '../store'

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [fx, setFx] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (user?.olist_customer_id) {
      loadOrders()
    } else {
      setIsLoading(false)
    }
  }, [user?.olist_customer_id])
  
  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const response = await ordersAPI.getByCustomerUniqueId(user.olist_customer_id, {
        brl_to_vnd: 1
      })
      setOrders(response.data?.orders || [])
      setSummary(response.data?.summary || null)
      setTimeline(response.data?.timeline || null)
      setFx(response.data?.fx || null)
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatBrl = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price)
  }

  const formatVnd = (price) => {
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
  
  const getStatusColor = (status) => {
    const colors = {
      created: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      shipping: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const getStatusLabel = (status) => {
    const labels = {
      created: 'Đã tạo',
      confirmed: 'Đã xác nhận',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy'
    }
    return labels[status] || status
  }

  const convertBrlToVnd = (amount) => {
    const rate = Number(fx?.brl_to_vnd || 5000)
    return formatVnd((Number(amount) || 0) * rate)
  }

  const formatOrderNetTotal = (order) => {
    const total = Number(order.total_amount || 0)
    return convertBrlToVnd(total)
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Đơn hàng của tôi</h1>

      {summary && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Tổng đơn hàng</p>
              <Receipt className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{summary.total_orders}</p>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Tổng chi tiêu (VND)</p>
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatVnd(summary.total_spent_vnd_estimate)}</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Ngày mua đầu tiên</p>
            <p className="text-lg font-semibold text-gray-900 mt-2">
              {formatDate(timeline?.first_purchase_date)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Ngày mua gần nhất</p>
            <p className="text-lg font-semibold text-gray-900 mt-2">
              {formatDate(timeline?.last_purchase_date)}
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 text-sm text-blue-700">
            <p>
              <strong>Lưu ý:</strong> Bạn có thể chủ động hủy đơn hàng vì lý do sai sót khi đặt mua. Tuy nhiên, xin lưu ý rằng <strong>đơn hàng chỉ có thể được hủy trong trạng thái "Đã xác nhận"</strong> (tức là trước khi shop bàn giao cho đơn vị vận chuyển). Nếu có vấn đề phát sinh sau khi đơn đã giao, vui lòng liên hệ trực tiếp với chúng tôi hoặc xem <Link to="/support/returns" className="font-semibold underline text-blue-800">Chính sách đổi trả</Link>.
            </p>
          </div>
        </div>
      </div>
      
      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : orders.length > 0 ? (
        <>
          <div className="space-y-4">
            {orders.map((order) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-gray-500">
                        Đơn hàng #{order.id}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span>{formatDate(order.created_at)}</span>
                    <span>•</span>
                    <span>{order.items ? order.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0} sản phẩm</span>
                    <span>•</span>
                    <span className="font-semibold text-gray-900">
                      {formatOrderNetTotal(order)}
                    </span>
                  </div>

                  
                  {/* First few items preview */}
                  <div className="mt-4 flex gap-2">
                    {order.items?.slice(0, 4).map((item, idx) => (
                      <div
                        key={`${order.id}-${idx}`}
                        className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100"
                      >
                        <img
                            src={item.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.product_name || 'Item')}&background=random&size=56`}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {order.items?.length > 4 && (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
        </>
      ) : (
        <div className="text-center py-16">
          <Package className="w-24 h-24 text-gray-300 mx-auto" />
          <h2 className="mt-6 text-xl font-semibold text-gray-900">
            Chưa có đơn hàng nào
          </h2>
          <p className="mt-2 text-gray-500">
            Bạn chưa đặt đơn hàng nào. Hãy bắt đầu mua sắm!
          </p>
          <Link
            to="/products"
            className="mt-6 inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      )}
    </div>
  )
}

export default OrdersPage
